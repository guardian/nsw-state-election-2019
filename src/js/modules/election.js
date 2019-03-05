import xr from 'xr'
import template from '../../templates/template.html'
import { $, $$, round, numberWithCommas, wait, getDimensions } from '../modules/util'
import Ractive from 'ractive'
import * as d3 from 'd3'
import moment from 'moment'
//import stack from '../../templates/seatstack.html'
import partypeople from './../partypeople.json'

export class Electron {

  constructor() {

    var self = this

    this.created = false

    this.api = "https://interactive.guim.co.uk/docsdata/1efGTW-zJnaxdvAUPQFU7I39TnfO9e6itzqMiyKV3_JU.json" ;

    this.isApp = (!!navigator.platform.match(/iPhone|iPod|iPad/) && window.location.origin === "file://" || !!navigator.platform.match(/iPhone|iPod|iPad/) && window.location.origin === 'null') ? true : false;

    this.database = {
      timestamp: "",
      ticker: false,
      latest: [],
      isApp: self.isApp,
      TOTAL_SEATS: 88,
      MAJORITY_SEATS: 45,
      partyData: [],
      resultCount: 88,
      partyListLeft: [],
      partyListRight: [],
      electionSelection: function(num) {
        
          return (num / self.database.TOTAL_SEATS) * 100

      },
      seatDisplay: function(num) {
        
          return (num > 1) ? num : '' ;

      }

    }

   if (self.isApp) {
      var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
      $("#appticker").style.maxWidth = `${width}px`;
      $("body").style.maxWidth = `${width}px`;
    }

    this.init() ;

  }

  init() {

    var self = this

    xr.get(self.api).then((resp) => {

        self.googledoc = resp.data.sheets.Sheet1;

        self.googledoc.forEach((e, i) => {

          e.id = i
            
          e.timestamp = 0

          e.margin = +e.margin
          
        })

        self.clone = JSON.parse(JSON.stringify(self.googledoc))

        self.dataset = JSON.parse(JSON.stringify(self.clone))

        self.loadstar()

        window.setInterval(() => this.fetchDataAndRender(), 20000);
        
    });

  }

  fetchDataAndRender() {

    var self = this

    xr.get(self.api).then((resp) => {

        self.googledoc = resp.data.sheets.Sheet1;

        self.googledoc.forEach((e, i) => {

          e.id = i

          e.margin = +e.margin

          if (self.clone[i].timestamp == 0 && e.prediction != "") {

            self.clone[i].timestamp = moment().unix()

            self.clone[i].prediction = e.prediction

          }

          // Pick up any electorates that have been called... then called for someone else
          if (e.prediction != "" && e.prediction != self.clone[i].prediction) {

            self.clone[i].timestamp = moment().unix()

            self.clone[i].prediction = e.prediction

          }

          
        })

        self.ordered = JSON.parse(JSON.stringify(self.clone))

        self.ordered = self.ordered.sort( (a, b) => {

            return b["timestamp"] - a["timestamp"]

        });

        self.ordered = self.ordered.filter( (item) => {

            return item.timestamp > 0

        });

        var mark = (self.ordered.length > 3) ? 3 : self.ordered.length ;

        self.ordered = self.ordered.slice(0, mark);

        if (self.ordered.length > 0) {
          self.database.ticker = true
          self.database.latest = []
          for (var i = 0; i < self.ordered.length; i++) {
            var obj = {}
            var status = (self.ordered[i].incumbent===self.ordered[i].prediction) ? 'hold' : 'gain' ;
            obj.party = self.ordered[i].prediction;
            obj.status = `${self.ordered[i].prediction} ${status} ${self.ordered[i].electorate}`;
            self.database.latest.push(obj)
          }
        }

        self.dataset = JSON.parse(JSON.stringify(self.googledoc))

        this.loadstar()

    });

  }

  loadstar() {

    var self = this

    this.left = []
    this.centre = []
    this.right = []
    this.totalSeats = this.dataset.length
    this.announced = [];

    this.dataset.forEach((e) => {
        
      (e.prediction != '') ? self.announced.push(e) : '' ;
      
    })

    this.partyData = d3.nest()
      .key((d) => d['prediction'].toUpperCase())
      .rollup((leaves) => leaves.length)
      .entries(this.announced)

    this.partyData.forEach((d) => {

      var datum = partypeople.filter((e) => {

        return (e.partyCode === d.key)

      })

      d.name = datum[0].partyName ;
      d.shortName = datum[0].shortName ;
      d.short = d.key.toLowerCase() ;
      d.position = datum[0].politicalization ;

      (d.position=='left') ? self.left.push(d) : (d.position=='right') ? self.right.push(d) : self.centre.push(d) ;

    });

    (this.left.length > 0) ? this.left.sort((a,b) => d3.descending(a.value, b.value)) : '' ;

    (this.right.length > 0) ? this.right.sort((a,b) => d3.descending(a.value, b.value)) : '' ;

    (self.partyData.length > 0) ? self.partyData.sort((a,b) => d3.descending(a.value, b.value)) : '' ;

    this.listSize = Math.ceil(self.partyData.length / 2)

    this.database.timestamp = 'Updated ' + moment().format("hh:mm A")
    this.database.partyData = [...self.left, ...self.right, ...self.centre]
    this.database.resultCount = self.totalSeats
    this.database.partyListLeft = self.partyData.slice(0,self.listSize)
    this.database.partyListRight = self.partyData.slice(self.listSize)

    if (this.created) {
      self.ractive.set(self.database)
      self.drawTable()
    } else {
      self.ractivate()
    }

  }

  ractivate() {

    var self = this

    this.ractive = new Ractive({
        el: '#appticker',
        data: self.database,
        template: template
    })

    this.created = true

    self.create()

    /*
   if (self.isApp) {
      $("#console").innerHTML = "Version IOS"
    } else {
      $("#console").innerHTML = "Version X"
    }
    */


  }

  create() {

    var self = this

      var headerData = [
          {name: "Electorate", sort: "electorate", direction: "ascending"},
          {name: "Incumbent", sort: "incumbent", direction: "ascending"},
          {name: "Margin", sort: "margin", direction: "ascending"},
          {name: "Prediction", sort: "prediction", direction: "ascending"}
      ]

      this.table = d3.select('#results-table').select("table") //document.querySelector('#election-embed')

      var headerRow = this.table.append("thead").append("tr")

      var header = headerRow.selectAll("th").data(headerData)
          .enter()
          .append("th")
          .text((d) => d.name)
          .attr("data-sortField", (d) => d.sort)
          .attr("data-sortDirection", (d) => d.direction)
          .classed("selected", (d) => (d.sort === "Electorate") ? true : false)
          .on("click", function(d) {
              if (d.sort) { 
                  if (d3.select(this).classed("selected")) {
                      if (d.direction == "ascending") { 
                          d.direction = "descending"
                      } else if (d.direction == "descending") {
                          d.direction = "ascending"
                      }                       
                      d3.select(this).attr("data-sortDirection", (d) => d.direction)
                  } else {
                      header.classed("selected", false)
                      d3.select(this).classed("selected", true)
                  }
                  self.updateSort(d.sort, d.direction) 
              }
          })

      this.tbody = this.table.append("tbody").attr("id","queensland")
  
      this.drawTable()

      d3.select('.veri-party-table-tab-switch').on("click", function() {
          
          if (d3.select(this).classed("gangsta")) {
              d3.select('#results-table').style('display','none')
              d3.select(this).classed("gangsta", false)
              d3.select(this).text('See all')
          } else {
              d3.select(this).classed("gangsta", true)
              d3.select('#results-table').style('display','block')
              d3.select(this).text('Hide all')
          }
      })

  }

  drawTable() {

      var self = this

      this.tbody.selectAll("tr").remove()
      
      this.row = this.tbody.selectAll("tr").data(self.dataset)
          .enter()
          .append("tr")

      this.row.append("td")
          .text((d) => d.electorate)

      this.row.append("td")
          .text((d) => d.incumbent) //.text((d) => ((d.incumbent!=d['margin-party']) ? self.notify(d.note) + ' ' + d.incumbent  : d.incumbent))
          .attr("class", "party-name")
          .attr("data-partyname", (d) => d.incumbent.toLowerCase())

      this.row.append("td")
          .text((d) => d['margin'])

      this.row.append("td")
          .text((d) => {
              return (d['prediction']!=d['incumbent'] && d['prediction']!='') ? '+ ' + d['prediction'] : d['prediction'] ;
          })
          .attr("class", "party-name")
          .attr("data-partyname", (d) => d.prediction.toLowerCase())

  }

  updateSort(sort, direction) {

      this.row.sort((a,b) => d3[direction](a[sort], b[sort]))

  } 

}
