/**
 * Created by Benedikt on 18/06/2017.
 */
var scene, camera, renderer, gpuCompute;
var dim = 100;
var zoom = 0.3;
var resultVar;
var mandelbrotUniforms;
var plotterUniforms;
var controls;
var cube;
var enableCube = false;
var partsCnt = 1;
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('white');
    camera = new THREE.PerspectiveCamera(75, $("#field").width() / $("#field").height(), 0.1, 1000);
    camera.position.z = 3;
    camera.position.x = 3;
    renderer = new THREE.WebGLRenderer();
    renderer.setSize($("#field").width(), $("#field").height());
    $("#field").get()[0].appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    if (enableCube) {

        var geometry = new THREE.BoxGeometry(1, 1, 1);
        var material = new THREE.MeshBasicMaterial({color: 'green'});
        cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
    }


    gpuCompute = new GPUComputationRenderer(dim * dim, dim, renderer);

    var dtResult = gpuCompute.createTexture();

    resultVar = gpuCompute.addVariable("resultVar", document.getElementById('mandelbrotpoints').textContent, dtResult);
    gpuCompute.setVariableDependencies(resultVar, [resultVar]);

    mandelbrotUniforms = resultVar.material.uniforms;
    resultVar.material.uniforms.maxIters = {value: 128};
    resultVar.material.uniforms.mode = {value: 0};
    resultVar.material.uniforms.real_width = {value: dim};
    resultVar.material.uniforms.zoom = {value: zoom};
    resultVar.material.uniforms.pos_ref = {type: "v3", value: new THREE.Vector3(0, 0, 0)};
    var error = gpuCompute.init();
    if (error !== null) {
        console.error(error);
    }

    var points = dim * dim * dim;
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array(points * 3);
    var uvs = new Float32Array(points * 2);
    var p = 0;
    for (var j = 0; j < dim; j++) {
        for (var i = 0; i < dim * dim; i++) {
            uvs[p++] = i / ( dim * dim - 1 );
            uvs[p++] = j / ( dim - 1 );
        }
    }
    console.log(uvs);
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    plotterUniforms = {
        textureResult: {value: []},
        parts: {value: partsCnt},
        cameraConstant: {value: getCameraConstant(camera)},
    };
    var material = new THREE.ShaderMaterial({
        uniforms: plotterUniforms,
        vertexShader: document.getElementById('plotter').textContent
    });
    material.extensions.drawBuffers = true;
    var particles = new THREE.Points(geometry, material);
    particles.matrixAutoUpdate = false;
    particles.updateMatrix();
    scene.add(particles);
    gpuCompute.compute();

    var result = gpuCompute.getCurrentRenderTarget(resultVar).texture;
    console.log(result);
    plotterUniforms.textureResult.value.push(result);
    render();

}
$("body").ready(init);
function render() {
    requestAnimationFrame(render);
    if (enableCube) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.02;
    }
    renderer.render(scene, camera);
}
function getCameraConstant(camera) {
    return $("#field").height / ( Math.tan(THREE.Math.DEG2RAD * 0.5 * camera.fov) / camera.zoom );
}