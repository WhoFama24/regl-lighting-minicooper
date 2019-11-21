// A5 Fragment Processing Code
// Parts for students complete are maked by TODO; the rest is pre-processing

Math.radians = function(degrees) {
    return degrees * Math.PI / 180;
}

Math.degrees = function(radians) {
    return radians * 180 / Math.PI;
}

// geometry: An associative array with three keys:
//      - vertexdata:   An Array of floating point vertex data. It is an
//                      interleaved float array of 3 position coordinates,
//                      3 normal coordinates, and 2 texture coordinates.
//      - indexdata:    An array of unsigned integers for the index/element
//                      buffer. Specifies how the triangles are connected.
//      - groups:       A dictionary mapping Strings to Arrays. The strings
//                      are the names of the parts, the arrays are indices
//                      into geometry.indexdata that defines that part.
// So geometry.vertexdata, geometry.indexdata, and geometry.group is your
// information loaded here. geometry.groups.keys() are the names of the parts
// used for materials and the values of the indexdata indices mentioned above.
let geometry = undefined;

// materials:   An associative Array with String:Associative Array pairs. The
//              keys are the name of the parts from geometry.groups, the
//              associative array defines material properties for lighting and
//              texture mapping. For A4, only the "color" key should be used
//              (the textures are not provided in this assignment).
let materials = undefined;

// Load regl module into fullsize element on the page
const canvas = document.getElementById("regl-canvas");
const regl = createREGL({canvas: canvas});

// Sizing for buffer strides & offsets
const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;
const INT_SIZE = Int8Array.BYTES_PER_ELEMENT;

// Four data elements loaded from web server: two shader programs, geometry, and materials
// vertexSource/fragmentSource: glsl strings for the shaders
let vertexSource = undefined;
let fragmentSource = undefined;

let mini_diffuse_texture_image = new Image();
let mini_diffuse_texture_image_loaded = false;

// Object destructuring to simplify glMatrix library calls
const {vec2, vec3, vec4, mat2, mat3, mat4} = glMatrix;

// Scene Information
const parameters = {
    projection: "perspective",

    keypress_theta: Math.radians(360/64),
    keypress_trans: 5,

    normal_map: false,
    local_lighting: true,
    light_attenuation: false,
    diffuse_texture: true,
};

// Object to manipulate the MINI model
class MiniCooperModel {
    constructor() {
        this.model_transform_stack = [];

        let rot = mat4.create(); let scl = mat4.create();
        mat4.rotateX(rot, rot, Math.radians(-90));
        mat4.scale(scl, scl, [1/181/5, 1/181/5, 1/181/5]);

        this.model_transform_stack.push(rot);   // Rotate to global coord system
        this.model_transform_stack.push(scl);   // Scale to canonical view volume
    }

    turnLeft() {
        let rot = mat4.create();
        mat4.rotateZ(rot, rot, parameters.keypress_theta);
        this.model_transform_stack.push(rot);
    }

    turnRight() {
        let rot = mat4.create();
        mat4.rotateZ(rot, rot, -parameters.keypress_theta);
        this.model_transform_stack.push(rot);
    }

    moveForward() {
        let trans = mat4.create();
        mat4.translate(trans, trans, [0, -parameters.keypress_trans, 0]);
        this.model_transform_stack.push(trans);
    }

    moveBackward() {
        let trans = mat4.create();
        mat4.translate(trans, trans, [0, parameters.keypress_trans, 0]);
        this.model_transform_stack.push(trans);
    }

    getModelTransform() {
        let M = mat4.create();
        for (var t of this.model_transform_stack) {
            mat4.multiply(M, M, t);
        }
        return M;
    }
}
let mini_model = new MiniCooperModel();

class LightColor {
    constructor({r=255,g=255,b=255}) {
        this.r = r;
        this.g = g;
        this.b = b;
    }
}
class DirectionalLight {
    constructor() {
        this.position = vec4.create();
        this.color = [1,1,1];
    }

    getLightDirection() {
        let out = vec4.create();
        vec4.normalize(out, this.position);
        vec4.negate(out, out);
        return out;
    }
}

// Set up four Fetch calls for the resources and process accordingly.
// Each one calls the init() function; this function only completes when
// all resources are loaded
function load()
{
    fetch('a5.vert.glsl', {cache: "no-store"})
    .then(function(response) {
        return response.text();
    })
    .then(function(txt) {
        vertexSource = txt;
        init();
    });

    fetch('a5.frag.glsl', {cache: "no-store"})
    .then(function(response) {
        return response.text();
    })
    .then(function(txt) {
        fragmentSource = txt;
        init();
    });

    fetch('mini_geometry.json', {cache: "no-store"})
    .then(function(response) {
        return response.json();
    })
    .then(function(obj) {
        geometry = obj;
        init();
    });

    fetch('mini_material.json', {cache: "no-store"})
    .then(function(response) {
        return response.json();
    })
    .then(function(obj) {
        materials = obj;
        init();
    });

    mini_diffuse_texture_image.src = "mini_body_diffuse.png";
    mini_diffuse_texture_image.onload = function() {
        mini_diffuse_texture_image_loaded = true;
        init();
    }

    // Add key listener for keyboard events
    document.addEventListener('keydown', (event) => {
        const keycode = event.key;
        if(keycode == 'ArrowRight')
        {
            mini_model.turnRight();
        }
        else if(keycode == 'ArrowLeft')
        {
            mini_model.turnLeft();
        }
        else if(keycode == 'ArrowUp')
        {
            mini_model.moveForward();
        }
        else if(keycode == 'ArrowDown')
        {
            mini_model.moveBackward();
        }
        else if(keycode == 'p')
        {
            parameters.projection = "perspective";
        }
        else if(keycode == 'o')
        {
            parameters.projection = "orthographic";
        }
        else if(keycode == 'a')
        {
            parameters.light_attenuation = !parameters.light_attenuation;
        }
        else if(keycode == 'n')
        {
            parameters.normal_map = !parameters.normal_map;
            parameters.local_lighting = !parameters.local_lighting;
        }
        else if(keycode == 't')
        {
            parameters.diffuse_texture = !parameters.diffuse_texture;
        }
       });
}

// The intialization function. Checks for all resources before continuing
function init()
{
    // Is everything loaded?
    if(vertexSource === undefined
        || fragmentSource === undefined
        || geometry === undefined
        || materials === undefined
        || !mini_diffuse_texture_image_loaded)
        return;

    // Create regl buffer for vertex data
    const mini_vertices = regl.buffer(geometry.vertexdata);
    const mini_diffuse_texture = regl.texture({flipY: true, data: mini_diffuse_texture_image});

    // Create regl draw command using indexed geometry and props
    const draw_mini_parts = regl({
        vert: vertexSource,
        frag: fragmentSource,
        attributes: {
            vertexposition: {
                buffer: mini_vertices,
                size: 3,
                stride: 8 * FLOAT_SIZE,
                offset: 0 * FLOAT_SIZE,
            },
            vertexnormal: {
                buffer: mini_vertices,
                size: 3,
                stride: 8 * FLOAT_SIZE,
                offset: 3 * FLOAT_SIZE,
            },
            vertextexcoord: {
                buffer: mini_vertices,
                size: 2,
                stride: 8 * FLOAT_SIZE,
                offset: 6 * FLOAT_SIZE,
            },
            vertexcolor: {
                constant: regl.prop('color')
            },
        },
        uniforms: {
            // control flags
            use_normal_map: () => {return parameters.normal_map},
            use_local_lighting: () => {return parameters.local_lighting},
            use_attenuation: () => {return parameters.light_attenuation},
            use_diffuse_texture: regl.prop('use_texture'),

            // transformations
            model: regl.prop('model'),
            view: regl.prop('view'),
            projection: regl.prop('projection'),
            view_inv: regl.prop('view_inv'),
            transform_normals: regl.prop('transform_normals'),

            // material properties
            alpha: regl.prop('alpha'),
            material_specular: [1.0, 1.0, 1.0, 1.0],
            material_shininess: 30.0,
            mini_diffuse_texture: mini_diffuse_texture,

            // light properties
            scene_ambient: [0.2, 0.2, 0.2, 1.0],
            light_position: [1.0, 1.0, 1.0, 1.0],
            light_diffuse: [1.0, 1.0, 1.0, 1.0],
            light_specular: [1.0, 1.0, 1.0, 1.0],
            light_constantAttenuation: 0.0,
            light_linearAttenuation: 1.0,
            light_quadraticAttenuation: 0.0,
            light_spotCutoffAngle: 180.0,
            light_spotExponent: 0.0,
            light_spotDirection: [0.0, 0.0, 0.0],
        },
        primitive: "triangles",
        elements: regl.prop('elements')
    });

    // Draw frames
    regl.frame(({viewportWidth, viewportHeight}) => {
        regl.clear({
            color: [255, 255, 255, 255],
            depth: 1
        });

        let frame_batch = [];
        for (const [key, value] of Object.entries(geometry.groups)) {
            const num_elements = 3*(value[1] - value[0]);
            const start = 3*value[0];
            const end = start + num_elements;

            // Model Transformations
            let model = mini_model.getModelTransform();

            // Viewing Transformations
            let view = mat4.create();
            let view_inv = mat4.create();
            mat4.lookAt(view, [0.5, 0.5, 1], [0, 0, 0], [0, 1, 0]);
            mat4.invert(view_inv, view);

            // Projection Transformations
            let projection = mat4.create();
            let viewport_aspectratio = viewportWidth / viewportHeight;
            switch(parameters.projection) {
                case "perspective": {
                    mat4.perspective(projection, Math.radians(45), viewport_aspectratio, 0.1, undefined);
                    break;
                }
                case "orthographic": {
                    mat4.ortho(projection, -1, 1, -1/viewport_aspectratio, 1/viewport_aspectratio, 0.1, 2);
                }
            }

            // Normal Vectors Transformation
            let transform_normals = mat3.create();
            let temp = mat4.create();
            mat4.transpose(temp, model);
            mat4.invert(temp, temp);
            mat3.fromMat4(transform_normals, temp);

            // Set alpha value for windows
            let alpha = 1.0;
            if (key == "Windows") {
                alpha = 1.0;
            }

            // Use diffuse textures if provided and selected
            let use_texture = false;
            if (materials[key].diffuse === "mini_body_diffuse.png" && parameters.diffuse_texture)
            {
                use_texture = true;
            }

            // Create regl frames to render
            frame_batch.push({
                elements: new Uint16Array(geometry.indexdata.slice(start, end+1)),
                color: materials[key].color,
                use_texture: use_texture,
                alpha: alpha,
                model: model,
                view: view,
                projection: projection,
                view_inv: view_inv,
                transform_normals: transform_normals,
            });
        }
        draw_mini_parts(frame_batch);
    });
}

function calculate_driver_camera() {
    let x = []; let y = []; let z = [];
    const value = geometry.groups["Driver"];
    const num_elements = 3*(value[1] - value[0]);
    const start = 3*value[0];
    const end = start + num_elements;
    const vertex_indices = geometry.indexdata.slice(start, end+1);
    for (const indx in vertex_indices) {
        x.push(geometry.vertexdata[8*indx]);
        y.push(geometry.vertexdata[8*indx+1]);
        z.push(geometry.vertexdata[8*indx+2]);
    }
    let eye = vec3.fromValues((Math.max(...x)+Math.min(...x))/2, Math.min(...y), Math.max(...z));
    let center = vec3.create();
    vec3.add(center, eye, [0,-10, -1]);
}

// Call load
load();
