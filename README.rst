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

After a succesful installation, you will get a ``make_sigurds_plot`` executable available. You can
give it an ``HEALPIX`` fits file and the program will first convert it into ``CAR`` pixelisation map
and then produce the different images as well as the ``html`` code

.. code:: shell

   $ make_sigurds_plot --healpix-file your_healpix_map.fits -v -m 0

The ``-v`` and ``-m 0`` are ``enplot/webplot`` options meaning respectively verbosity and making
zero value transparent. In this way, you can pass ``enplot/webplot`` options and tweak the final
result as your convenience.

You can also mask part of the ``HEALPIX`` map by giving a mask file

.. code:: shell

   $ make_sigurds_plot --healpix-file your_healpix_map.fits --mask-file your_mask_map.fits

The process will result in the creation of a ``leaflet`` directory holding the different images at
different scales and, an ``index.html`` file holding the javascript code. You will have to push this
file with the ``leaflet`` directory on some server to get the final rendering.
