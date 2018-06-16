# EasyVis

_A simple example of cross-platform 3D visualization using WebGL via Three.js_

Includes example Docker file for building containerized derivatives for deployment on e.g. Amazon Web Services.

## Requirements

* [Three.js](https://threejs.org/)
* [Node.js](https://nodejs.org/) (for simple test server)

The example Node.js server (`server.js`) also makes use of some standard tools ([Express](https://expressjs.com/), [Compression](https://www.npmjs.com/package/compression), [Helmet](https://github.com/helmetjs/helmet)) which are available via [npm](https://www.npmjs.com/).

## Platform compatibility

In principle, anything that supports Three.js (and/or Node.js)!

## Example usage

For a quick and simple test, run the provided `server.js` script with Node:

	EasyVis $ node server.js EasyVis.html

... and then point your web browser to `localhost:3000`.

The example Web page (`EasyVis.html`) sets up three `div` elements of class `EasyVis`. These `div` elements are identified by the client browser (see `client.js`), which then inserts a new `canvas` element into each `div` as the target for an `EasyVis` instance.

Each `EasyVis` instance then posts a `GET` request to the URI `/scene/ID` (with `ID` an integer identifier for a specific `EasyVis` instance).

If all went well, one should observe three separate `EasyVis` instances arranged side-by-side in the web browser; each instance should have a similar (but different!) test scene displayed (**Fig. 1**).

![Example view from test data](example.png)

## Docker

Included in this repository is a simple Dockerfile to create a Docker image of the example `EasyVis` server with the appropriate software present.

To build the Docker image from the appropriate directory, identify the output image with a suitable "tag" (e.g. `stuff/easyvis`):

	EasyVis $ docker build -t stuff/easyvis .

To run the containerized `EasyVis` server, remember to map the required ports using `-p pM:pC` to expose the published container port (`pC`) as a specific port on the local machine (`pM`):

	EasyVis $ docker run -it --rm -p 3000:3000 stuff/easyvis

In the example above, we use a standard interactive terminal (`-it`) and specify that any changes to the local container file system should not be saved on exit (`--rm`).

## Notes

To ensure the EasyVis views resize correctly, we must take care to ensure:

* Any enclosing containers should specified `fr` units for grid layouts, rather than `auto` etc.
* `div` elements to contain an `EasyView` instance should set `min-height` and `min-width` properties to 0; this prevents e.g. grid elements becoming larger on window resize, _but not being able to shrink again_ (due to the inability of e.g. a grid element to be smaller than its content).