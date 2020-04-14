============
sigurds plot
============
.. inclusion-marker-do-not-remove

Python module to produce Sigurd Naess' CMB map view.

Installing
----------

If you just want to use the code then you only have to do

.. code:: shell

   $ pip install git+https://github.com/thibautlouis/sigurds_plot.git

If you plan to develop or even play with the content of the code, then you first need to clone this
repository to some location

.. code:: shell

    $ git clone https://github.com/thibautlouis/sigurds_plot.git /where/to/clone

Then you can install the code and its dependencies *via*

.. code:: shell

    $ pip install -e /where/to/clone

Running the code
----------------

After a succesful installation, you will get two binaries

1) ``healpix2car`` allows you to transform an HEALPIX map into a CAR map. You can choose the final CAR
   resolution as well as the bounding box on which to project the HEALPIX map

2) ``car2tiles`` convert a CAR map into the different static PNG tile files. These tile files are used
   by system such as https://leafletjs.com/

Example flow
------------

Imagine you have a full sky map in HEALPIX pixelisation. First we will convert it into a CAR map

.. code:: shell

   $ healpix2car -i my_healpix_map.fits -o my_car_map.fits

The nominal angular resolution of the CAR map is 0.5 arcminutes and the bounding box is (-180, 180,
-75, 30) degrees in right ascension and delination. The time to process the HEALPIX map really
depends on how much memory you have on your machine. For instance, generating a full sky map at 0.5
arcminutes with I, Q, U components produce a 13 Gb file !

If you have enough memory and the previous conversion step was successful, you need to convert the
CAR map into several PNG files corresponding different level of zoom and thus angular precision.

.. code:: shell

   $ car2tiles -i my_car_map.fits

This will produce by default a ``leaflet/my_car_map.fits`` directory holding the different PNG
files. You can choose a different output directory with the ``--output-dir`` option. You can also
pass ``enplot/webplot`` options (see ``enplot`` `arguments
<https://github.com/simonsobs/pixell/blob/master/pixell/enplot.py#L228>`_). By default the
``webplot`` backend is used in order to change the colorization (color map and color range).

You can also give a mask file in order to mask region of the sky (geometries of both files must
match)

.. code:: shell

   $ car2tiles -i my_car_map.fits --mask-file my_mask.fits
