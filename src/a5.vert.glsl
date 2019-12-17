// A5 MINI vertex shader
precision highp float;

// Attributes and Uniforms
attribute vec3 vertexposition;
attribute vec3 vertexnormal;
attribute vec2 vertextexcoord;
attribute vec3 vertexcolor;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
uniform mat3 transform_normals;       // 3x3 inverse transpose of modelview matrix
uniform sampler2D mini_diffuse_texture;

varying vec4 fragposition;
varying vec3 fragnormal;
varying vec2 fragtexcoord;
varying vec3 material_diffuse;
varying vec3 material_ambient;

void main()
{
    fragposition = model * view * vec4(vertexposition, 1.0);
    fragnormal = normalize(transform_normals * vertexnormal);
    fragtexcoord = vertextexcoord;
    material_diffuse = vertexcolor;
    material_ambient = vertexcolor;
    gl_Position = projection * view * model * vec4(vertexposition, 1.0);
}
