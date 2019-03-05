var el = document.createElement('script');

el.src = '<%= path %>/app.js';
document.body.appendChild(el);

function onElementHeightChange(elm, callback){
    var lastHeight = elm.clientHeight, newHeight;
    (function run(){
        newHeight = elm.clientHeight;
        if( lastHeight != newHeight )
            callback();
        lastHeight = newHeight;

        if( elm.onElementHeightChangeTimer )
            clearTimeout(elm.onElementHeightChangeTimer);

        elm.onElementHeightChangeTimer = setTimeout(run, 250);
    })();
}

onElementHeightChange(document.body, function(){
    window.frameElement.height = document.body.offsetHeight + 150
});