
function Application()
{
    this.config = createDefaultConfig();

    this.scene = new THREE.Scene(); 

    this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 100 ); 
    this.camera.position.set( 0, 0.5, 3 );

    this.renderer = new THREE.WebGLRenderer( { alpha: false, antialias: true }  );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderer.setClearColor(0xcccccc);
    if(this.renderer.shadowMap)
    {
        this.renderer.shadowMap.enabled = true;
    }



    document.body.style.cssText = 'margin: 0; overflow: hidden;' ;
    document.body.appendChild( this.renderer.domElement );
    
    this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );

    this.stand = createStandByCfg(this.config);

    this.scene.add(this.stand);

    this.pendulum = createPendulum(this.config.pendulumHeight, this.config.pendulumRadius, this.config.targetRadius
        , this.config.pipeThickness / 8, this.config.mirrorOffset, this.config.mirrorW, this.config.mirrorH, this.config.mirrorD);

    this.scene.add(this.pendulum);
    this.pendulum.cargo.visible = false;
    
    var laserIntersactableObjects = this.stand.children.filter( function(o){
        return o.isIntersactable;
    });

    this.laserRay = createLaserRay(this.config.mirrorOffset, 
        (this.config.pipeThickness / 8) + this.config.mirrorD, this.config.highLength - this.config.lowLength, 
        laserIntersactableObjects, this.stand.ruler, this.camera);
    this.scene.add(this.laserRay);
    this.laserRay.visible = false;

    var lights = [];
    lights[0] = new THREE.PointLight( 0xffffff, 1, 0, 2 );
    lights[1] = new THREE.PointLight( 0xffffff, 1, 0, 2 );
    lights[2] = new THREE.PointLight( 0xffffff, 1, 0, 2 );

    lights[0].position.set( 0, 1, 0 );
    lights[1].position.set( 100, 200, 100 );
    lights[2].position.set( - 100, - 200, - 100 );

    this.scene.add(lights[0]);
    this.scene.add(lights[1]);
    this.scene.add(lights[2]);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    var light = lights[0];
	light.castShadow = true;
	light.shadow.mapSize.width = 1024;
	light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 10;


    if(window.Audio)
    {
        this.shotSound = new Audio('src/shot_sound.mp3');
    }

    var self = this;
    window.addEventListener( 'resize', function () {

        self.camera.aspect = window.innerWidth / window.innerHeight;
        self.camera.updateProjectionMatrix();

        self.renderer.setSize( window.innerWidth, window.innerHeight );
    }, false );

    this.userEvents = [];
    this.simulation = {active: false, pAngle: 0, pSpeed: 0, pMaxAgle: 0, time: 0};

    this.simulationSets = 
    [
        {  pSpeed: 1.4142135623730951, pMaxAgle: 0.12727922061357855 }, //3e-4, false
        {  pSpeed: 1.4142135623730951, pMaxAgle: 0.1940301007575886 }, //7e-4, false
        {  pSpeed: 1.1547005383792515, pMaxAgle: 0.10392304845413264 }, //3e-4, true
        {  pSpeed: 1.1547005383792515, pMaxAgle: 0.15842491386563332 }, //7e-4, true
    ];
}


Application.prototype.run = function()
{
    var self = this;
    function animate() 
    {
        self.timeDelta = Date.now() - self.timeLastUpdate;
        self.timeTotal += self.timeDelta;
        self.update();
        self.timeLastUpdate = Date.now();
        self.renderer.render(self.scene, self.camera);
        requestAnimationFrame(animate); 
    };

    this.timeLastUpdate = Date.now();
    this.timeTotal = 0;
    this.timeDelta = 0;
    animate();
};


Application.prototype.update = function()
{
    while(this.userEvents.length)
    {
        var e = this.userEvents.shift();
        if(e.type === 'laserActivityChanged')
        {
            this.laserRay.visible = e.value;
        }
        else if(e.type === 'cargoActivityChanged')
        {
            this.pendulum.cargo.visible = e.value;
        }
        else if(e.type === 'startSimulation')
        {
            this.playShotSound();
            
            this.simulation.active = true;
            this.simulation.time = -this.timeDelta;
            this.simulation.pAngle  = 0;
            this.simulation.pMaxAgle = this.simulationSets[e.value].pMaxAgle;
            this.simulation.pSpeed = this.simulationSets[e.value].pSpeed;
            this.pendulum.piston.visible = true;
        }
        else if(e.type === 'stopSimulation')
        {
            this.simulation.active = false;
            this.simulation.pAngle = 0;
            this.pendulum.piston.visible = false;
        }
    }


    this.controls.update();
    if(this.simulation.active)
    {
        this.simulation.time += this.timeDelta;
        this.simulation.pAngle = this.simulation.pMaxAgle * Math.sin(this.simulation.pSpeed * this.simulation.time / 1000);
    }
    else
    {
        this.simulation.pAngle = 0;
    }
    this.pendulum.rotation.set(0, -this.simulation.pAngle, 0);
    this.laserRay.setPAngle(-this.simulation.pAngle);

    if(this.onAfterUpdate)
    {
        this.onAfterUpdate();
    }
}


Application.prototype.playShotSound = function()
{
    if(this.shotSound)
    {
        this.shotSound.play();
    }
}

Application.prototype.pushEvent = function(e)
{
    this.userEvents.push(e);
}


function createDefaultConfig()
{
    return {
        lowHeight: 1,
        highHeight: 2,
        lowLength: 0.7,
        highLength: 1.7,
        pipeThickness: 0.05,
        

        mirrorOffset: 0.15,
        mirrorW: 0.1,
        mirrorH: 0.02,
        mirrorD: 0.001,
        
        pendulumRadius: 0.5,
        pendulumHeight: 0.4,
        targetRadius: 0.1
    };
}


function createStandByCfg(cfg)
{
    return createStand(cfg.lowHeight, cfg.highHeight, cfg.lowLength, cfg.highLength, cfg.pipeThickness, cfg.mirrorOffset, cfg.mirrorH, cfg.pendulumRadius)
};



function createStand(lowHeight, highHeight, lowLength, highLength, thickness, mirrorOffset, mirrorH, pendulumRadius)
{
    var quality = 32;
    var stand = new THREE.Group();
    //var pipeMaterial = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
    var pipeMaterial = new THREE.MeshStandardMaterial({metalness: 0.6, roughness: 0.9, color: 0xcccccc});

    var tableDesk = new THREE.Mesh(new THREE.BoxGeometry(2 * pendulumRadius + 2 * thickness, thickness, highLength + 2 * thickness),  new THREE.MeshStandardMaterial({metalness: 0.6, roughness: 0.9, color: 0xcccccc}));
    tableDesk.position.set(0, lowHeight, highLength / 2);
    tableDesk.receiveShadow = true;
    stand.add(tableDesk);
    
    var leg1 = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, lowHeight, quality),  pipeMaterial);
    leg1.position.set(-pendulumRadius, lowHeight/ 2, 0);
    stand.add(leg1);

    var leg2 = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, lowHeight, quality),  pipeMaterial);
    leg2.position.set(pendulumRadius, lowHeight/ 2, 0);
    stand.add(leg2);

    var leg3 = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, lowHeight, quality),  pipeMaterial);
    leg3.position.set(-pendulumRadius, lowHeight/ 2, highLength);
    stand.add(leg3);

    var leg4 = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, lowHeight, quality),  pipeMaterial);
    leg4.position.set(pendulumRadius, lowHeight/ 2, highLength);
    stand.add(leg4);

    var pipeThickness = thickness / 4;
    var supportPipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeThickness, pipeThickness, highHeight + pipeThickness, quality),  pipeMaterial);
    supportPipe.position.set(0, (highHeight + pipeThickness) / 2, 0 );
    supportPipe.castShadow = true;
    stand.add(supportPipe);



    var highHorPipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeThickness, pipeThickness, lowLength + pipeThickness, quality),  pipeMaterial);
    highHorPipe.rotateX(Math.PI / 2);
    highHorPipe.position.set(0, highHeight, (lowLength + pipeThickness) / 2);
    highHorPipe.castShadow = true;
    stand.add(highHorPipe);


    var lowLineBase = new THREE.Mesh(new THREE.CylinderGeometry(thickness / 2, thickness, 2 * thickness, quality),  new THREE.MeshStandardMaterial({metalness: 0.6, roughness: 0.9, color: 0xcccccc}));
    lowLineBase.position.set(0, (lowHeight + thickness), lowLength);
    lowLineBase.receiveShadow = true;
    lowLineBase.castShadow = true;
    stand.add(lowLineBase);


    var lineGeom = new THREE.Geometry();
    lineGeom.vertices.push(new THREE.Vector3(0, lowHeight, lowLength));
    lineGeom.vertices.push(new THREE.Vector3(0, highHeight, lowLength));
    var line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: 0x000000 }));
    stand.add(line);


    var laserPipeLen = pipeThickness + ((highHeight - lowHeight) / 2) + mirrorOffset;
    var laserPipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeThickness, pipeThickness, laserPipeLen, quality),  pipeMaterial);
    laserPipe.position.set(0, lowHeight + (thickness / 2) + laserPipeLen / 2, highLength);
    laserPipe.castShadow = true;
    laserPipe.isIntersactable = true;
    stand.add(laserPipe)

    var laserMaterial = new THREE.MeshStandardMaterial({metalness: 1, roughness: 0.5, color: 0xaaaaaa });
    var laserBase = new THREE.Mesh(new THREE.CylinderGeometry(thickness / 4, 0.0001, thickness, quality),  laserMaterial);
    laserBase.rotateX(Math.PI / 2);
    laserBase.position.set(0, lowHeight + ( 3 * thickness / 4) + laserPipeLen - thickness, highLength - thickness / 2);
    laserBase.castShadow = true;
    stand.add(laserBase);

    var gun = loadGun();
    gun.rotateY(Math.PI);
    gun.position.set(-pendulumRadius + gun.modelDelta.x, lowHeight + ((highHeight - lowHeight) / 2) + gun.modelDelta.y, highLength + gun.modelDelta.z);
    stand.add(gun);

    var gunBaseLen = laserPipeLen - mirrorOffset - gun.modelDelta.height;
    var gunBase = new THREE.Mesh(new THREE.CylinderGeometry(thickness / 4, thickness / 4, gunBaseLen, quality),  pipeMaterial);
    gunBase.position.set(-pendulumRadius, lowHeight + gunBaseLen / 2, highLength);
    gunBase.castShadow = true;
    stand.add(gunBase);


    var rulerTexture = new CanvasRuler(2 * pendulumRadius, mirrorH);
    var ruler = new THREE.Mesh(new THREE.PlaneGeometry(2 *pendulumRadius, mirrorH, 1, 1), new THREE.MeshBasicMaterial({depthWrite: false, transparent: true,  side: THREE.DoubleSide, map: new THREE.CanvasTexture(rulerTexture.canvas)}));
    ruler.position.set(-pendulumRadius, lowHeight + ( 3 * thickness / 4) + laserPipeLen - thickness, highLength + thickness / 4);
    stand.add(ruler);

    stand.ruler = {mesh: ruler, texture: rulerTexture};



    stand.position.set( 0, -lowHeight - ((highHeight - lowHeight) / 2), -lowLength);
    return stand;
};



function loadGun()
{
    var modelLoader = new THREE.OBJLoader();
    var textureLoader = new THREE.TextureLoader();
    var gunModel = modelLoader.parse(akModel.mesh);
    gunModel.scale.set(0.002, 0.002, 0.002);
    gunModel.modelDelta = {x: 0, y: -0.05, z: 0, height: 0.15};
    var mesh = gunModel.children[0];
    mesh.castShadow = true;

    mesh.material = new THREE.MeshStandardMaterial({metalness: 0.2, roughness: 0.8, color: 0xaaaaaa});
    if(akModel.diffuse)
    {
        mesh.material.map = textureLoader.load(akModel.diffuse);
        if(akModel.normal)
        {
            mesh.material.normalMap = textureLoader.load(akModel.normal);
        }
    }
    else
    {
        mesh.material = new THREE.MeshStandardMaterial({metalness: 1, roughness: 0.5, color: 0x222222});
    }

    return gunModel;
}


function createPendulum(height, radius, targetRadius, pipeThickness, mirrorOffset, mirrorW, mirrorH, mirrorD)
{
    var quality = 32;
    var pendulum = new THREE.Group();
    var pipeMaterial = new THREE.MeshStandardMaterial({metalness: 0.6, roughness: 0.9, color: 0xcccccc});
    var mirrorMaterial = new THREE.MeshStandardMaterial({metalness: 0.2, roughness: 0.9, color: 0x555555});
    var targetMaterial = new THREE.MeshStandardMaterial({metalness: 0, roughness: 1, color: 0xaa0000});

    var verPipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeThickness, pipeThickness, height, quality),  pipeMaterial);

    var horPipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeThickness, pipeThickness, 2 * radius, quality),  pipeMaterial);
    horPipe.rotateZ(Math.PI / 2);
    
    var middleWeight = new THREE.Mesh(new THREE.CylinderGeometry(2 * pipeThickness, 2 * pipeThickness, height / 2, quality),  pipeMaterial);
    var leftWeight = new THREE.Mesh(new THREE.CylinderGeometry(3 * pipeThickness, 3 * pipeThickness, radius / 2, quality),  pipeMaterial);
    var rightWeight = new THREE.Mesh(new THREE.CylinderGeometry(3 * pipeThickness, 3 * pipeThickness, radius / 2, quality),  pipeMaterial);

    leftWeight.rotateZ(Math.PI / 2);
    rightWeight.rotateZ(Math.PI / 2);
    leftWeight.position.set(radius / 2, 0, 0);
    rightWeight.position.set(-(radius / 2), 0, 0);

    var mirror = new THREE.Mesh(new THREE.BoxGeometry(mirrorW, mirrorH, mirrorD),  mirrorMaterial);
    mirror.position.set(0, mirrorOffset, pipeThickness);

    var reflector = new THREE.Reflector( new THREE.PlaneBufferGeometry(mirrorW, mirrorH), {
        clipBias: 0.0001,
        textureWidth: window.innerWidth,
        textureHeight: window.innerWidth,
        color: 0xcccccc,
        recursion: 1
    } );
    reflector.position.set(0, mirrorOffset, pipeThickness + mirrorD)
    pendulum.add( reflector );

    if(window.leaserNormalMap)
    {
        targetMaterial.normalMap = (new THREE.TextureLoader()).load(window.leaserNormalMap);
    }

    var target = new THREE.Mesh(new THREE.CylinderGeometry(targetRadius, targetRadius, 8 * mirrorD, quality), targetMaterial);
    target.rotateX(Math.PI / 2);
    target.position.set(-radius, 0, pipeThickness);


    var piston = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.005, quality), new THREE.MeshStandardMaterial({metalness: 1, roughness: 1, color: 0x111111}));
    piston.rotateX(Math.PI / 2);
    piston.position.set(-radius, 0, pipeThickness + 4 * mirrorD);
    piston.visible = false;


    var cargo = new THREE.Mesh( new THREE.SphereGeometry( 6 * pipeThickness, 64, 64 ), pipeMaterial);
    cargo.position.set(radius, 0, 0);

    pendulum.cargo = cargo;
    pendulum.piston = piston;


    pendulum.add(verPipe);
    pendulum.add(horPipe);
    pendulum.add(middleWeight);
    pendulum.add(leftWeight);
    pendulum.add(rightWeight);

    pendulum.add(mirror);
    pendulum.add(target);
    pendulum.add(cargo);
    pendulum.add(piston);

    pendulum.children.forEach(function(c) {c.castShadow = true;})
    return pendulum;
};


function createLaserRay(y, z0, z, intersectObjects, ruler, camera)
{    
    var group = new THREE.Group();
    var raycaster = new THREE.Raycaster();
    var rayGeom = new THREE.Geometry();
    rayGeom.vertices.push(new THREE.Vector3(0, y, z));
    rayGeom.vertices.push(new THREE.Vector3(0, y, z0));
    rayGeom.vertices.push(new THREE.Vector3(0, y, z));

    var ray = new THREE.Line(rayGeom, new THREE.LineBasicMaterial({color: 0x00ff00, transparent: true, blending: THREE.AdditiveBlending}));

    var rulerGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01, 1, 1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, depthWrite: false, transparent: true, map: new THREE.CanvasTexture(createGlowTexture())}));
    rulerGlow.renderOrder = 999;

    var maxZ = 100;
    group.setPAngle = function(angle)
    {
        var x = maxZ * Math.tan(2 * angle)
        ray.geometry.vertices[2].x = x;
        ray.geometry.vertices[2].z = maxZ;
        raycaster.set(ray.geometry.vertices[1], ray.geometry.vertices[2].clone().normalize());
        var intersects = raycaster.intersectObjects(intersectObjects);
        var intersaction = intersects[0];
        if(intersaction)
        {
            ray.geometry.vertices[2].x = intersaction.point.x;
            ray.geometry.vertices[2].z = intersaction.point.z;
        }

        var rulerIntersection = raycaster.intersectObjects([ruler.mesh])[0];
        if(rulerIntersection && !intersaction)
        {
            rulerGlow.visible = true;
            rulerGlow.position.set(rulerIntersection.point.x, rulerIntersection.point.y - 0.0015, rulerIntersection.point.z);
        }
        else
        {
            rulerGlow.visible = false;
        }

        ray.geometry.verticesNeedUpdate = true;
    };


    function createGlowTexture()
    {
		var canvas	= document.createElement( 'canvas' );
		var context	= canvas.getContext( '2d' );
		canvas.width = 64;
        canvas.height = 64;
        
        context.beginPath();
        context.rect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "rgba(0, 0, 0, 0)";
        context.fill();

		var gradient = context.createRadialGradient(32, 32, 4, 32, 32, 32);		
		gradient.addColorStop( 0, 'rgba(0, 255, 0, 1)' );
		gradient.addColorStop( 1.0, 'rgba(100, 100, 100, 0)' );

		context.fillStyle = gradient;
		context.fillRect(0, 0, canvas.width, canvas.height);

		return canvas;	
    };

    group.add(rulerGlow);
    group.add(ray);
    return group;
}





function CanvasRuler(len, width)
{
    this.x = null;

    var step = 5;
    var canvas = document.createElement('canvas');
    canvas.width = len * 1000 * step;
    canvas.height = width * 1000 * step; 

    var ctx = canvas.getContext('2d');

    this.step = step;;
    this.canvas = canvas;
    this.ctx = ctx;

    this.draw();
}

CanvasRuler.prototype.draw = function()
{
    var step = this.step;;
    var ctx = this.ctx;
    var canvas = this.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(100, 100, 100, 0.6)";
    ctx.fill();
    
    ctx.lineWidth= 0.1;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = "#000";
    ctx.font = "30px Arial";

    for(var i = 0; i <= canvas.width; i += step)
    {
        ctx.moveTo(i, 0);
        var mm = i / step;
        if(mm % 10 === 0)
        {
            ctx.lineTo(i, canvas.height / 2); 
            ctx.fillText(mm / 10, i, canvas.height / 2 + 30);
        }
        else if(mm % 5 === 0)
        {
            ctx.lineTo(i, 3 * canvas.height / 8); 
        }
        else
        {
            ctx.lineTo(i, canvas.height / 4); 
        }
        
        ctx.stroke();
    }

    if(this.x)
    {
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, canvas.height / 20 , 0 , 2 * Math.PI, true);
        ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
        ctx.fill();
    }
}
