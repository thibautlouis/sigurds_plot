# example usage
# python plot_sigurd.py -vgr 250 -m 0 "plot/leaflet/*/*.fits"
# v stands for verbosity
# g for grid
# r for range (here +/- 250 \mu K)
# m is a mask making the value transparent in the output image
# see pixell/enplot for more options
# don't forget to change html_utils_dir

from pixell import  mpi, enplot
import tile_utils_sigurd
from pspy import so_map
import os


html_utils_dir = "/Users/thibautlouis/Desktop/sigurd_plot/html_utils"
map_name = "cmb.fits"

plots_dir = "plot/leaflet"

if os.path.exists(plots_dir):
    os.system('rm -rf %s'%plots_dir)

comm = mpi.COMM_WORLD
tile_utils_sigurd.leaftile(map_name, plots_dir, verbose=True, comm=comm, monolithic=True)
args = enplot.parse_args()

for plot in enplot.plot_iterator(*args.ifiles, comm=mpi.COMM_WORLD, **args):
    enplot.write(plot.name, plot)
    
os.system('find %s -name "*.fits" -type f -delete'%plots_dir)

html_utils_files = ["leaflet.css", "L.Control.MousePosition.css", "leaflet-src.js",
                    "L.Control.MousePosition.js", "Leaflet.Graticule.js", "leaflet-ellipse.js",
                    "L.ColorizableLayer.js", "multitile2.js"]
                    
for file in html_utils_files:
    os.system('cp %s/%s plot/%s'%(html_utils_dir, file, file))


filename = "plot/plot.html"
g = open(filename, mode='w')
g.write('<html>\n')
g.write('<head>\n')
g.write('<link rel=stylesheet href=leaflet.css>\n')
g.write('<link rel=stylesheet href=L.Control.MousePosition.css>\n')
g.write('<script src=leaflet-src.js></script>\n')
g.write('<script src=L.Control.MousePosition.js></script>\n')
g.write('<script src=Leaflet.Graticule.js></script>\n')
g.write('<script src=leaflet-ellipse.js></script>\n')
g.write('<script src=L.ColorizableLayer.js></script>\n')
g.write('<script src=multitile2.js></script>\n')
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
