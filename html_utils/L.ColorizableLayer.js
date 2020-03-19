L.ColorizableUtils = {
	colormaps: {
		"gray":   [[0,0x000000],[1,0xffffff]],
		"planck": [[0,0x0000ff],[0.332,0x00d7ff],[0.5,0xffedd9],[0.664,0xffb400],[0.828,0xff4b00],[1,0x640000]],
		"wmap":   [[0,0x000080],[0.15,0x0000ff],[0.4,0x00ffff],[0.7,0xffff00],[0.9,0xff5500],[1,0x800000]],
	},
	lookup_tables: {},
	colorize: function (idata, opts) {
		var opts = Object.assign({colormap:"planck", min: -1, max:1, scale:1, nbit:8}, opts);
		var buf  = new ArrayBuffer(idata.length*4);
		var rgba = new Uint32Array(buf);
		var tab  = this.get_lookup_table(opts.colormap, opts.nbit)
		var N    = 1<<opts.nbit;
		var v1   = opts.min*opts.scale;
		var v2   = opts.max*opts.scale;
		for(var i = 0; i < idata.length; i++) {
			var val  = idata[i];
			if(isNaN(val)) {
				rgba[i] = 0;
			} else {
				var x    = ((val-v1)/(v2-v1)*N)|0;
				if(x < 0) x = 0; if(x >= N) x = N-1;
				rgba[i] = tab[x];
			}
		}
		return new Uint8ClampedArray(buf);
	},
	build_lookup_table: function (colormap, nbit) {
		var N = 1<<nbit;
		var buf  = new ArrayBuffer(N*4);
		var rgba = new Uint8ClampedArray(buf);
		var tab  = this.colormaps[colormap];
		for(var i = 0; i < N; i++) {
			var x = i/N;
			var j;
			if(x < 0) x = 0; if(x > 1) x = 1;
			for(j = 1; j < tab.length && tab[j][0] < x; j++);
			var x1 = tab[j-1][0], y1 = tab[j-1][1];
			var x2 = tab[j-0][0], y2 = tab[j-0][1];
			var r  = (x-x1)/(x2-x1);
			rgba[4*i+2] = (y1&0xff)*(1-r)+(y2&0xff)*r;
			y1 >>>= 8; y2 >>>= 8;
			rgba[4*i+1] = (y1&0xff)*(1-r)+(y2&0xff)*r;
			y1 >>>= 8; y2 >>>= 8;
			rgba[4*i+0] = (y1&0xff)*(1-r)+(y2&0xff)*r;
			rgba[4*i+3] = 0xff;
		}
		return new Uint32Array(buf);
	},
	get_lookup_table: function(colormap, nbit) {
		if(!(colormap in this.lookup_tables)) this.lookup_tables[colormap] = {}
		if(!(nbit in this.lookup_tables[colormap]))
			this.lookup_tables[colormap][nbit] = this.build_lookup_table(colormap, nbit);
		return this.lookup_tables[colormap][nbit];
	},
	decode: function(imgdata) {
		// First copy out the non-redundant values of the RGBA input we get
		var ibuf    = new ArrayBuffer(imgdata.width*imgdata.height);
		var idata   = new Uint8Array(ibuf);
		for(var i = 0; i < idata.length; i++)
			idata[i] = imgdata.data[4*i];
		// First parse the metadata
		var nbyte   = idata[0];
		// Cumbersome
		function get_as_double(idata, offset) {
			var buf = new ArrayBuffer(8);
			var arr = new Uint8Array(buf);
			for(var i = 0; i < 8; i++) arr[i] = idata[i+offset];
			return (new Float64Array(buf))[0];
		}
		var quantum = get_as_double(idata, 1);
		var width   = imgdata.width;
		var height  = ((imgdata.height-1)/nbyte)|0;
		var npix    = width*height;
		// We can now allocate our output buffer. We will use float32
		var obuf    = new ArrayBuffer(npix*4);
		var odata   = new Float32Array(obuf);
		for(var y = 0; y < height; y++) {
			for(var x = 0; x < width; x++) {
				var ipix = (y+1)*width+x;
				var opix = y*width+x;
				// Read in the full, n-byte integer in sign,mag format
				var v = 0;
				var nff = 0;
				for(var b = nbyte-1; b >= 0; b--) {
					v <<= 8;
					v |= idata[ipix+b*npix];
					nff += (v&0xff)==0xff;
				}
				if(nff==nbyte) {
					// We're masked
					odata[opix] = NaN
				} else {
					if(v&1) v = -(v>>>1);
					else    v >>>= 1;
					odata[opix] = v*quantum;
				}
			}
		}
		return {width: width, height: height, nbyte: nbyte, quantum: quantum, data:odata};
	},
};

L.TileLayer.Colorizable = L.TileLayer.extend({

	options: {
		colormap: "planck",
		min: -500,
		max:  500,
		scale:  1,
		nbit:   8,
	},

	initialize: function (url, opts) {
		L.TileLayer.prototype.initialize.call(this, url, opts);
		this.cache = null;
	},

	setColors: function (opts) {
		L.setOptions(this, opts);
		this._updateTiles();
	},

	setCache: function (cache) {
		// I want this.cache to point to the same object as cache, so can't use object.assign
		if(!("t" in cache)) cache.t = 0;
		if(!("data" in cache)) cache.data = {};
		if(!("nmax" in cache)) cache.nmax = 100;
		this.cache = cache;
	},

	createTile: function (coords, done) {
		var url  = this.getTileUrl(coords);
		var tile = this._getFromCache(url);
		if(tile != null) {
			// Since an element can only have one parent leaflet gets confused if we
			// return the same element again and again. So return a copy instead.
			var otile = tile.cloneNode(false);
			otile.raw = tile.raw;
			otile.complete = true;
			this._updateTile(otile);
			L.Util.requestAnimFrame(L.bind(done, this, null, otile));
			return otile;
		} else {
			var img  = document.createElement("img");
			var tile = document.createElement("canvas");
			L.DomEvent.on(img, 'load',  L.bind(this._tileOnLoad,  this, done, tile, img, url));
			//L.DomEvent.on(img, 'error', L.bind(this._tileOnError, this, done, tile));
			L.DomEvent.on(img, 'error', function(a,b,c,d,e,f,g,h) {
				console.log(["createTile error", a, b, c, d, e, f, g, h]);
			
			
			});
			if (this.options.crossOrigin) { tile.crossOrigin = ''; }
			tile.alt = '';
			tile.setAttribute('role', 'presentation');
			tile.complete = false;
			img.src = url;
			return tile;
		}
	},

	_tileOnLoad: function (done, tile, img, url) {
		// First copy over the tile data
		tile.width = img.width;
		tile.height= img.height;
		var context  = tile.getContext("2d");
		// Read the image data. This will be RGBA, even though our images are grayscale.
		// So we only need one byte out of 4 later.
		context.drawImage(img, 0, 0);
		var imgdata  = context.getImageData(0, 0, img.width, img.height);
		var res      = L.ColorizableUtils.decode(imgdata);
		// Update the canvas with the real tile size
		tile.width   = res.width;
		tile.height  = res.height;
		tile.raw     = res.data;
		tile.complete= true;
		this._addToCache(url, tile);
		this._updateTile(tile);
		// For https://github.com/Leaflet/Leaflet/issues/3332
		if (L.Browser.ielt9) {
			setTimeout(L.bind(done, this, null, tile), 0);
		} else {
			done(null, tile);
		}
	},

	_updateTile: function (tile) {
		var rgba     = L.ColorizableUtils.colorize(tile.raw, this.options);
		var imgdata  = new ImageData(rgba, tile.width, tile.height);
		var context  = tile.getContext("2d");
		context.putImageData(imgdata, 0, 0);
	},

	_updateTiles: function () {
		if (!this._map) { return; }
		for (var key in this._tiles) {
			var tile = this._tiles[key];
			// Don't try to update an invalid tile. I'm not
			// sure why this happens - maybe it hasn't been fully
			// loaded yet. This doesn't result in missing tiles, so
			// I guess they recover. Without this check, the colorize
			// function can fail. That seems to have lead to the different
			// layers ending up in inconsistent state, e.g. with different
			// color maps etc.
			if(tile.el.raw) this._updateTile(tile.el);
		}
	},

	_addToCache: function (url, tile) {
		if(this.cache == null) return;
		if(url in this.cache.data) {
			// just mark it as recent
			this.cache.data[url].t = this.cache.t++;
		} else {
			var ncache = this.cache.data.length;
			if(ncache >= this.cache.nmax) {
				// too much in cache, remove oldest
				var tmin = null, umin;
				for(var u in this.cache.data) {
					if(tmin == null || u.t < tmin) {
						tmin = u.t;
						umin = u;
					}
				}
				delete this.cache.data[umin];
			}
			// then add to cache
			this.cache.data[url] = {t: this.cache.t++, tile: tile};
		}
	},

	_getFromCache: function (url) {
		if(this.cache == null || !(url in this.cache.data)) return null;
		else {
			// Mark as recent
			this.cache.data[url].t = this.cache.t++;
			return this.cache.data[url].tile;
		}
	},
});

L.tileLayer.colorizable = function(url, options) {
	return new L.TileLayer.Colorizable(url, options);
};
