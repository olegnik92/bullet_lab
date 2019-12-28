

function UserInput(app)
{
    var panel = document.getElementById('control-panel');
    document.getElementById('input-header').addEventListener('click', function()
    {
        var isCollapsed = (panel.getAttribute('data-collapsed') === 'true');
        panel.setAttribute('data-collapsed', !isCollapsed);
    });

    var cartridgeInput = document.getElementById('cartridge');

    document.getElementById('laser-activity').addEventListener('change', function(e)
    {
        app.pushEvent({type: 'laserActivityChanged', value: this.checked});
    });


    var cargoInput = document.getElementById('cargo');
    cargoInput.addEventListener('change', function(e)
    {
        app.pushEvent({type: 'cargoActivityChanged', value: this.checked});
    });


    var startButton = document.getElementById('startButton');
    var stopButton = document.getElementById('stopButton');
    startButton.addEventListener('click', function()
    {
        var setIndex = cartridgeInput.selectedIndex + (cargoInput.checked ? 2 : 0);
        app.pushEvent({type: 'startSimulation', value: setIndex});
        startButton.disabled = true;
        cargoInput.disabled = true;
    });

    stopButton.addEventListener('click', function(e)
    {
        app.pushEvent({type: 'stopSimulation'});
        startButton.disabled = false;
        cargoInput.disabled = false;
    });

    var timer = document.getElementById('timer');
    app.onAfterUpdate = function()
    {
        if(app.simulation.active)
        {
            timer.textContent = (app.simulation.time / 1000);
        }        
    };
}