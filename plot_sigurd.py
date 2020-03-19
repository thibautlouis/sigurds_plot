# example usage
# python plot_sigurd.py -vgr 250 -m 0 "leaflet/*/*.fits"
# v stands for verbosity
# g for grid
# r for range (here +/- 250 \mu K)
# m is a mask making the value transparent in the output image
# see pixell/enplot for more options 

from pixell import  mpi, enplot
import tile_utils_sigurd
from pspy import so_map
import os

map_name = "cmb.fits"
odir = "leaflet"
if os.path.exists(odir):
    os.system("rm -rf %s"%odir)

comm = mpi.COMM_WORLD
tile_utils_sigurd.leaftile(map_name, odir, verbose=True, comm=comm, monolithic=True)
args = enplot.parse_args()

for plot in enplot.plot_iterator(*args.ifiles, comm=mpi.COMM_WORLD, **args):
    enplot.write(plot.name, plot)

filename = "test_plot.html"
g = open(filename, mode='w')
g.write('<html>\n')
g.write('<head>\n')
g.write('<link rel=stylesheet href=html_utils/leaflet.css>\n')
g.write('<link rel=stylesheet href=html_utils/L.Control.MousePosition.css>\n')
g.write('<script src=html_utils/leaflet-src.js></script>\n')
g.write('<script src=html_utils/L.Control.MousePosition.js></script>\n')
g.write('<script src=html_utils/Leaflet.Graticule.js></script>\n')
g.write('<script src=html_utils/leaflet-ellipse.js></script>\n')
g.write('<script src=html_utils/L.ColorizableLayer.js></script>\n')
g.write('<script src=html_utils/multitile2.js></script>\n')
g.write('<style>\n')
g.write('body {margin: 0px;} #map {height: 100%; cursor: default;}\n')
g.write('.leaflet-control-attribution, .leaflet-control-mouseposition { font-size: 2.5vh ! important; }\n')
g.write('#map img, #map canvas {image-rendering: optimizeSpeed; image-rendering: pixelated;}\n')
g.write('</style>\n')
g.write('</head>\n')
g.write('<body>\n')
g.write('<div id=map></div>\n')
g.write('<script>\n')
g.write('var my_layers ={tag:"survey", vals:[{tag:"comp", vals:[deflayer("./leaflet/{z}/tile_{y}_{x}.png")]}]};\n')
g.write('var map = add_map("map");\n')
g.write('add_layers(map, my_layers);\n')
g.write('add_graticule(map);\n')
g.write('var cache = {};\n')
g.write('add_cache(map, cache);\n')
g.write('document.addEventListener("keydown", function (e) {\n')
g.write('if(e.keyCode == "Z".charCodeAt(0)) cache.data = {}; });\n')
g.write('</script>\n')
g.write('</body>\n')
g.write('</html>\n')
g.close()




