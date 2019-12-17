# regl-lighting-minicooper
Regl-based rendering of MINI Cooper to demonstrate lighting effects for Mississippi State University's CSE 6413 course.

This project demonstrates rendering with model textures and various light sources.
The light sources implemented for this project are directional lighting, point lighting, and spot lighting.
Additionally, a normal map of the model was implemented.

## Details
The directional lighting source assumes a powerful light source at an infinite distance such that all the light rays intersect the scene in the same direction.
This is the simplest light source model.
The following image demonstrates directional lighting on a MINI Cooper model provided in the course.
In the controls, the light position sliders describe the negative direction of the light rays.
Equivalently, the light rays have the direction determined by the position shooting towards the origin.

![Directional Lighting Demo](/doc/demo-lighting-directional.png?raw=true "Directional Lighting")

The point light source assumes an isotropic light radiating from some position in the scene.
The lighting effect is determined by the distance and position of the light.
The following image demonstrates a point light on the MINI Cooper.

![Point Lighting Demo](/doc/demo-lighting-point.png?raw=true "Point Lighting")

The spot light source assumes a conical light radiating towards a specific point in the scene.
The fidelity of this model can be improved by using a falloff region.
The following image demonstrates a spot light on the MINI Cooper.

![Spot Lighting Demo](/doc/demo-lighting-spot.png?raw=true "Spot Lighting")

## Run
This project was developed in a web-based platform and can be run using any web server.
For testing and demonstration purposes, a simple Python web server was used.
The process for running this code using Python 3.x is the following:

```sh
cd \path\to\repository
python -m http.server
```

After starting the web server, open a web browser and navigate to `localhost:8000/a5.html`.
