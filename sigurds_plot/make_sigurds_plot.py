import os

import numpy as np

from pixell import enplot, mpi
from pspy import so_map


def healpix2car(healpix_map_file,
                healpix_fields=(0, 1, 2),
                mask_file=None,
                car_map_file=None,
                car_resolution=0.5,
                car_bounding_box=(-180, 180, -75, 30),
                lmax=6000):
    """ Convert HEALPIX map to CAR map """
    healpix_map = so_map.read_map(healpix_map_file, fields_healpix=healpix_fields)

    # CAR Template
    ncomp = healpix_map.ncomp
    ra0, ra1, dec0, dec1 = car_bounding_box
    res = car_resolution
    car_template = so_map.car_template(ncomp, ra0, ra1, dec0, dec1, res)
    projected_map = so_map.healpix2car(healpix_map, car_template, lmax=lmax)

    if mask_file is not None:
        mask = so_map.read_map(mask_file)
        if projected_map.ncomp != mask.ncomp:
            raise ValueError("Map and mask have different number of components")
        projected_mask = so_map.healpix2car(mask, car_template, lmax=lmax)
        for i in range(mask.nomp):
            projected_map.data[i] *= np.where(projected_mask.data[i] < 0.5, 0, 1)

    if car_map_file is None:
        import tempfile
        car_map_file = tempfile.NamedTemporaryFile().name

    print("Writing '{}' file".format(car_map_file))
    projected_map.write_map(car_map_file)
    return car_map_file


def make_sigurd_plots(car_map_file,
                      enplot_args=[],
                      output_dir="leaflet",
                      delete_fits=True,
                      use_webplot=True,
                      generate_html_file=True,
                      fields=(0, 1, 2)):
    """ Generate PNG images with Sigurd's plot routines """
    if os.path.exists(output_dir):
        os.system("rm -rf %s" % output_dir)

    comm = mpi.COMM_WORLD
    from sigurds_plot import tile_utils_sigurd
    tile_utils_sigurd.leaftile(car_map_file,
                               output_dir,
                               verbose="-v" in enplot_args,
                               comm=comm if not mpi.disabled else None,
                               monolithic=True)

    # Check if path to fits file are already stored
    fits_files = os.path.join(output_dir, "*/*.fits")
    if fits_files not in enplot_args:
        enplot_args.append(fits_files)

    if use_webplot:
        from sigurds_plot import webplot
        args = webplot.parse_args(enplot_args)
        webplot.plot(args)
    else:
        args = enplot.parse_args(enplot_args)
        for plot in enplot.plot_iterator(*args.ifiles, comm=comm, **args):
            enplot.write(plot.name, plot)

    if delete_fits and comm.rank == 0:
        [os.remove(fits) for fits in args.ifiles]

    if generate_html_file and comm.rank == 0:
        from jinja2 import Environment, PackageLoader
        env = Environment(loader=PackageLoader("sigurds_plot", "templates"))
        template = env.get_template("index.html")
        with open(os.path.join(os.path.dirname(output_dir), "index.html"), mode="w") as outfile:
            outfile.write(
                template.render(output_dir=output_dir, use_webplot=use_webplot, fields=fields))


def main():
    import argparse
    parser = argparse.ArgumentParser(
        description="A python program to produce Sigurd's plots and corresponding html pages",
        epilog="Additional options will be passed to enplot/webplot program")
    parser.add_argument("--healpix-file",
                        help="input FITS file corresponding to HEALPIX map",
                        type=str,
                        default=None)
    parser.add_argument(
        "--healpix-fields",
        help="tuple that enables HEALPIX fields i.e. (0,) will only keep temperature field ",
        type=tuple,
        default=(0, 1, 2))
    parser.add_argument("--car-file",
                        help="input FITS file corresponding to CAR map",
                        type=str,
                        default=None)
    parser.add_argument(
        "--car-bounding-box",
        help=
        "when converting an HEALPIX map into a CAR one, set the bounding box (ra0, dec0, ra1, dec1) all in degrees",
        type=tuple,
        default=(-180, 180, -75, 30))
    parser.add_argument(
        "--car-resolution",
        help="when converting an HEALPIX map into a CAR one, set the resolution in arcminutes",
        default=0.5)
    parser.add_argument("--mask-file",
                        help="set a mask file to apply to HEALPIX map before converting",
                        type=str,
                        default=None)
    parser.add_argument("--output-dir",
                        help="output directory holding png files",
                        type=str,
                        default="leaflet")
    parser.add_argument("--use-enplot",
                        help="use enplot routine (default use webplot)",
                        action="store_true",
                        default=False)
    parser.add_argument("--keep-fits-files",
                        help="keep intermediate FITS files",
                        action="store_true",
                        default=False)
    parser.add_argument("--no-html-file",
                        help="do not generate html file",
                        action="store_true",
                        default=False)
    args, enplot_args = parser.parse_known_args()

    car_map_file = args.car_file
    healpix_map_file = args.healpix_file
    if car_map_file is None and healpix_map_file is None:
        raise ValueError("Missing either HEALPIX or CAR filename!")

    comm = mpi.COMM_WORLD
    if healpix_map_file is not None and comm.rank == 0:
        car_map_file = healpix2car(healpix_map_file=healpix_map_file,
                                   healpix_fields=[int(i) for i in args.healpix_fields],
                                   mask_file=args.mask_file,
                                   car_map_file=car_map_file,
                                   car_resolution=args.car_resolution,
                                   car_bounding_box=args.car_bounding_box)
    if not mpi.disabled:
        comm.barrier()

    make_sigurd_plots(car_map_file,
                      enplot_args,
                      output_dir=args.output_dir,
                      delete_fits=not args.keep_fits_files,
                      use_webplot=not args.use_enplot,
                      generate_html_file=not args.no_html_file,
                      fields=[int(i) for i in args.healpix_fields])


# script:
if __name__ == "__main__":
    main()
