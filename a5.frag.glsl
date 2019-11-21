// A5 MINI fragment shader
precision highp float;

// Input
// control flags
uniform int lighting_mode;
uniform bool use_local_lighting;
uniform bool use_normal_map;
uniform bool use_attenuation;
uniform bool use_diffuse_texture;

// transformations
uniform mat4 model;
uniform mat4 view;
uniform mat4 view_inv;
uniform mat4 projection;
uniform mat3 transform_normals;       // 3x3 inverse transpose of modelview matrix

// material properties
uniform float alpha;
varying vec3 material_ambient;
varying vec3 material_diffuse;
uniform vec4 material_specular;
uniform float material_shininess;
uniform sampler2D mini_diffuse_texture;

// light properties
uniform vec4 scene_ambient;
uniform vec4 light_position;
uniform vec4 light_diffuse;
uniform vec4 light_specular;
uniform float light_constantAttenuation;
uniform float light_linearAttenuation;
uniform float light_quadraticAttenuation;
uniform float light_spotCutoffAngle;
uniform float light_spotExponent;
uniform vec3 light_spotDirection;

varying vec4 fragposition;
varying vec3 fragnormal;
varying vec2 fragtexcoord;

void main()
{
    // Normal Map
    if (lighting_mode == 0)
    {
        gl_FragColor = vec4(normalize(fragnormal), 1.0);
    }

    // Local Lighting Models
    else if (lighting_mode == 1 ||
             lighting_mode == 2 ||
             lighting_mode == 3)
    {
        vec3 modelnormal = normalize(fragnormal);
        vec3 cameranormal = normalize(vec3(view_inv * vec4(0.0,0.0,0.0,1.0)-fragposition));
        vec3 lightnormal;
        float attenuation;

        float dist = length(vec3(light_position - fragposition));
        if (use_attenuation) {
            attenuation = 1.0 / (light_constantAttenuation +
                                 light_linearAttenuation * dist +
                                 light_quadraticAttenuation * dist * dist);
        }
        else {
            attenuation = 1.0;
        }
        lightnormal = normalize(vec3(light_position));

        vec3 ambient;
        (use_diffuse_texture) ?
            ambient = vec3(scene_ambient) * vec3(texture2D(mini_diffuse_texture, fragtexcoord)) :
            ambient = vec3(scene_ambient) * vec3(material_ambient);

        vec3 diffuse;
        (use_diffuse_texture) ?
            diffuse = attenuation
                         * vec3(light_diffuse) * vec3(texture2D(mini_diffuse_texture, fragtexcoord))
                         * max(0.0, dot(modelnormal, lightnormal)) :
            diffuse = attenuation
                         * vec3(light_diffuse) * vec3(material_diffuse)
                         * max(0.0, dot(modelnormal, lightnormal));

        vec3 specular;
        if (dot(modelnormal,lightnormal) < 0.0) {
            specular = vec3(0.0, 0.0, 0.0);
        }
        else {
            specular = attenuation * vec3(light_specular) * vec3(material_specular)
                     * pow(max(0.0, dot(reflect(-lightnormal, modelnormal), cameranormal)), material_shininess);
        }

        gl_FragColor = vec4(ambient + diffuse + specular, alpha);
    }
}
