from pspy import so_map

# Healpix Template
nside = 4096
ncomp = 1
lmax = 6000

# CAR Template
ra0 = -180
ra1 = 180
dec0 = -75
dec1 = 30
res = 0.5

healpix_template = so_map.healpix_template(ncomp=ncomp, nside=nside)
clfile = "bode_almost_wmap5_lmax_1e4_lensedCls_startAt2.dat"
cmb_healpix = healpix_template.synfast(clfile)

car_template = so_map.car_template(ncomp, ra0, ra1, dec0, dec1, res)
cmb_projected = so_map.healpix2car(cmb_healpix, car_template, lmax=lmax)

map_name = "cmb.fits"
cmb_projected.write_map(map_name)

