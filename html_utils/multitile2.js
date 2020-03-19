function mod(a,b) { var c = a%b; return c < 0 ? c+b : c; }

function deflayer(url, name, opts) {
	var _opts = {
		id: 'moo',
		attribution: name,
		tileSize: 675,
		minZoom: -5,
		maxZoom:  5,
		maxNativeZoom: 0,
		minNativeZoom: -5,
		type: 'plain',
		colormap: 'planck',
		min: -500,
		max:  500,
		mask:   0,
	};
	if(opts) for(key in opts) _opts[key] = opts[key];
	if(_opts.type == "plain")
		return L.tileLayer(url, _opts);
	else if(_opts.type == "recolor")
		return L.tileLayer.colorizable(url, _opts);
}

function logstep(i) { return Math.pow(10,Math.floor(i/3))*[1,2,5][mod(Math.floor(i),3)]; }

function defgrat(opts) {
	var _opts = {
		showLabel: true,
		fontColor: "#000",
		color: "#000",
		weight: 0.2,
		minZoom: -7,
		maxZoom:  3,
		lngFormatTickLabel: function(lng) { return Math.round(lng*1000)/1000; },
		latFormatTickLabel: function(lat) { return Math.round(lat*1000)/1000; },
	};
	for(key in opts) _opts[key] = opts[key];
	if(!("zoomInterval" in _opts)) {
		_opts.zoomInterval = [];
		for(var i = _opts.maxZoom; i >= _opts.minZoom; i--)
			_opts.zoomInterval.push({start: i, end: 100, interval:
				logstep(Math.round(Math.min(-i,4)*0.90309))});
	}
	return L.latlngGraticule(_opts);
}

function parse_hilton(data) {
	var lines = data.split(/\r?\n/);
	var res = [];
	var tok_re = / +(?=(?:(?:[^"]*"){2})*[^"]*$)/g;
	var header = lines[0].split(tok_re);
	// Build header map
	var indmap = {};
	for(var i = 0; i < header.length; i++)
		indmap[header[i]] = i;
	// Then extract the values
	for(var i = 1; i < lines.length; i++) {
		var toks = lines[i].split(tok_re);
		if(toks.length < 10) continue;
		res.push({
			name: toks[indmap["name"]].slice(1,-1),
			pos:  L.latLng(parseFloat(toks[indmap["decDeg"]]), parseFloat(toks[indmap["RADeg"]])),
			SNR:  parseFloat(toks[indmap["SNR"]]),
			z:    parseFloat(toks[indmap["redshift"]]),
			source: toks[indmap["redshiftSource"]],
			ztype:  toks[indmap["redshiftType"]],
			classification: toks[indmap["classification"]],
		});
	}
	return res;
}

function defsrcs_hilton(url) {
	// First make the layer group we will put the sources in
	var lgroup = L.layerGroup();
	// Then set up the http request that will fetch the data
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.onreadystatechange = function(e) {
		if(this.readyState == 4 && this.status == 200) {
			var res = parse_hilton(this.responseText);
			for(var i = 0; i < res.length; i++) {
				var color = res[i].classification == "cluster" ? "#000" : "#888";
				for(var j = 0; j < 2; j++) {
					var wpos = L.latLng(res[i].pos.lat, res[i].pos.lng-360*j);
					var circle = L.circleMarker(wpos, {radius:16, fillOpacity:0, color:color});
					var desc = "<b><a href='https://www.acru.ukzn.ac.za/actpol-sourcery/displaySourcePage?name="+encodeURIComponent(res[i].name)+"&clipSizeArcmin=8.00'>"+res[i].name+"</a></b>" +
						" " + res[i].classification +
						"<br>RA  " + res[i].pos.lng.toFixed(4) +
						" dec " + res[i].pos.lat.toFixed(4) +
						" SN " + res[i].SNR.toFixed(2) +
						" z " + res[i].z.toFixed(3) +
						" src " + res[i].source +
						"<br><img src='http://skyserver.sdss.org/dr14/SkyServerWS/ImgCutout/getjpeg?TaskName=Skyserver.Chart.Image&ra="+res[i].pos.lng+"&dec="+res[i].pos.lat+"&scale=1.0&width=400&height=400&opt=&query='>" +
						"<a href=http://archive.eso.org/dss/dss/image?ra="+res[i].pos.lng+"&dec="+res[i].pos.lat+"&equinox=J2000&name=&x=25&y=25&Sky-Survey=DSS1&mime-type=image%2Fgif>Or try DSS1</a>";
					circle.bindPopup(desc, {minWidth:400, maxWidth: 500});
					lgroup.addLayer(circle);
				}
			}
		}
	}
	xhr.send();
	return lgroup;
}

function parse_sigurd(data) {
	var lines = data.split(/\r?\n/);
	var res = [];
	for(var i = 0; i < lines.length; i++) {
		var toks = lines[i].trim().split(/ +/);
		var lat = parseFloat(toks[5]);
		var lng = parseFloat(toks[3]);
		if(isNaN(lat) || isNaN(lng)) continue;
		res.push({
			type:  toks[0],
			name:  i+1,
			pos:   L.latLng(parseFloat(toks[5]), parseFloat(toks[3])),
			SNR:   parseFloat(toks[1]),
			SNR_filter: parseFloat(toks[2]),
			fwhm:  parseFloat(toks[7]),
			dfwhm: parseFloat(toks[8]),
			amp:   parseFloat(toks[9]),
			damp:  parseFloat(toks[10]),
		});
	}
	return res;
}

function defsrcs_sigurd(url, opts) {
	def_opts = {snmin: 0, color: "#000", type: "any", rad:16};
	if(opts != null) for(key in opts) def_opts[key] = opts[key];
	opts = def_opts;
	// First make the layer group we will put the sources in
	var lgroup = L.layerGroup();
	// Then set up the http request that will fetch the data
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.onreadystatechange = function(e) {
		if(this.readyState == 4 && this.status == 200) {
			var res = parse_sigurd(this.responseText);
			for(var i = 0; i < res.length; i++) {
				var color = opts.color;
				for(var j = 0; j < 2; j++) {
					if(res[i].SNR < opts.snmin) continue;
					if(opts.type != "any" && res[i].type != opts.type) continue;
					var wpos = L.latLng(res[i].pos.lat, res[i].pos.lng+360*j);
					var circle = L.circleMarker(wpos, {radius:opts.rad, fillOpacity:0, color:color});
					var desc = "<b>Obj " + res[i].name + " - " + res[i].type + "</a></b>" +
						"<br>RA  " + res[i].pos.lng.toFixed(4) +
						" dec " + res[i].pos.lat.toFixed(4) +
						" SN " + res[i].SNR.toFixed(2) + " (" + res[i].SNR_filter.toFixed(2) + ") " +
						" fwhm " + res[i].fwhm + "&pm; " + res[i].dfwhm +
						"<br><img src='http://skyserver.sdss.org/dr14/SkyServerWS/ImgCutout/getjpeg?TaskName=Skyserver.Chart.Image&ra="+res[i].pos.lng+"&dec="+res[i].pos.lat+"&scale=1.0&width=400&height=400&opt=&query='>" +
						"<a href=http://archive.eso.org/dss/dss/image?ra="+res[i].pos.lng+"&dec="+res[i].pos.lat+"&equinox=J2000&name=&x=25&y=25&Sky-Survey=DSS1&mime-type=image%2Fgif>Or try DSS1</a>";
					circle.bindPopup(desc, {minWidth:400, maxWidth: 500});
					lgroup.addLayer(circle);
				}
			}
		}
	}
	xhr.send();
	return lgroup;
}

function defsrcs_sigurd2(url, opts) {
	def_opts = {snmin: 0, color: "#000", type: "any", rad:16};
	if(opts != null) for(key in opts) def_opts[key] = opts[key];
	opts = def_opts;
	// First make the layer group we will put the sources in
	var lgroup = L.layerGroup();
	// Then set up the http request that will fetch the data
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.onreadystatechange = function(e) {
		if(this.readyState == 4 && this.status == 200) {
			var res = parse_sigurd(this.responseText);
			for(var i = 0; i < res.length; i++) {
				var color = opts.color;
				for(var j = 0; j < 2; j++) {
					if(res[i].SNR < opts.snmin) continue;
					if(opts.type != "any" && res[i].type != opts.type) continue;
					var wpos = L.latLng(res[i].pos.lat, res[i].pos.lng+360*j);
					var circle = L.circleMarker(wpos, {radius:opts.rad, fillOpacity:0, color:color});
					var desc = document.createElement("p");
					var namefield = document.createElement("b");
					namefield.appendChild(document.createTextNode("Obj " + res[i].name + " - " + res[i].type));
					desc.appendChild(namefield);
					desc.appendChild(document.createElement("br"));
					desc.appendChild(document.createTextNode("RA  " + res[i].pos.lng.toFixed(4) + " dec " + res[i].pos.lat.toFixed(4) + " SN " + res[i].SNR.toFixed(2) + " (" + res[i].SNR_filter.toFixed(2) + ") " + " fwhm " + res[i].fwhm + "&pm; " + res[i].dfwhm));
					var sdss = new Image();
					sdss.src = "http://skyserver.sdss.org/dr14/SkyServerWS/ImgCutout/getjpeg?TaskName=Skyserver.Chart.Image&ra="+res[i].pos.lng+"&dec="+res[i].pos.lat+"&scale=1.0&width=400&height=400&opt=&query=";
					desc.appendChild(sdss);
					desc.appendChild(document.createElement("br"));
					var dss = new Image();
					desc.appendChild(dss);
					circle.bindPopup(desc, {minWidth:400, maxWidth: 500});
					var dss_url = "http://archive.eso.org/dss/dss/image?ra="+res[i].pos.lng+"&dec="+res[i].pos.lat+"&equinox=J2000&name=&x=25&y=25&Sky-Survey=DSS1&mime-type=image%2Fgif";
					lgroup.addLayer(circle);
				}
			}
		}
	}
	xhr.send();
	return lgroup;
}

function load_dss_image(img, page_url) {
	console.log(["load_dss_image",img,page_url]);
}

function parse_nemo(data) {
	var lines = data.split(/\r?\n/);
	var res = [];
	for(var i = 0; i < lines.length; i++) {
		var toks = lines[i].trim().split(/ +/);
		var lat = parseFloat(toks[5]);
		var lng = parseFloat(toks[3]);
		if(isNaN(lat) || isNaN(lng)) continue;
		res.push({
			type:  toks[0],
			name:  i+1,
			pos:   L.latLng(parseFloat(toks[5]), parseFloat(toks[3])),
			SNR:   parseFloat(toks[1]),
			SNR_filter: parseFloat(toks[2]),
			fwhm:  parseFloat(toks[7]),
			dfwhm: parseFloat(toks[8]),
			amp:   parseFloat(toks[9]),
			damp:  parseFloat(toks[10]),
		});
	}
	return res;
}

// General, reusable catalog loader

function defsrcs(url, opts) {
	def_opts = {color: "#000", rad:16, format:"ngc", minsize:0, shape: "circle"};
	if(opts != null) for(key in opts) def_opts[key] = opts[key];
	opts = def_opts;
	if(opts.format == "ngc") parser = parse_ngc;
	else if(opts.format == "simbad_extended") parser = parse_simbad_extended;
	else if(opts.format == "hyperleda") parser = parse_hyperleda;
	else { console.log("Unknown catalog parser: " + opts.format); return; }
	// First make the layer group we will put the sources in
	var lgroup = L.layerGroup();
	// Then set up the http request that will fetch the data
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.onreadystatechange = function(e) {
		if(this.readyState == 4 && this.status == 200) {
			var res = parser(this.responseText, opts);
			for(var i = 0; i < res.length; i++) {
				for(key in opts) if(!(key in res[i])) res[i][key] = opts[key];
				if("size" in res[i] && res[i].size < res[i].minsize) continue;
				var color = res[i].color;
				for(var j = 0; j < 2; j++) {
					var wpos = L.latLng(res[i].pos.lat, res[i].pos.lng+360*j);
					var shape = L.circle(wpos, {radius:res[i].rad/60, fillOpacity:0, color:color});
					var desc = "<br><img class=sdss src='http://skyserver.sdss.org/dr14/SkyServerWS/ImgCutout/getjpeg?TaskName=Skyserver.Chart.Image&ra="+res[i].pos.lng+"&dec="+res[i].pos.lat+"&scale=1.0&width=400&height=400&opt=&query='>" +
						"<img class=dss  src='http://archive.eso.org/dss/dss/image?ra="+res[i].pos.lng+"&dec="+res[i].pos.lat+"&equinox=J2000&name=&x=30&y=30&Sky-Survey=DSS1&mime-type=download-gif'>" + 
						"<b>" + res[i].name + " - " + res[i].type + "</b>" +
						"<br>RA  " + res[i].pos.lng.toFixed(4) +
						" dec " + res[i].pos.lat.toFixed(4) +
						" " + res[i].info;
					shape.bindPopup(desc, {minWidth:400, maxWidth: 500});
					lgroup.addLayer(shape);
				}
			}
		}
	}
	xhr.send();
	return lgroup;
}

function parse_ngc(data) {
	var lines = data.split(/\r?\n/);
	var res = [];
	for(var i = 0; i < lines.length; i++) {
		var toks = lines[i].trim().split(/\t/);
		var lat = parseFloat(toks[2]);
		var lng = parseFloat(toks[1]);
		var size= parseFloat(toks[5]);
		if(isNaN(lat) || isNaN(lng)) continue;
		res.push({
			name: toks[0],
			pos:  L.latLng(lat, lng),
			type: toks[3],
			mag:  parseFloat(toks[4]),
			size: parseFloat(toks[5]),
			info: "type " + toks[3] + " mag " + toks[4] + " size " + toks[5],
			rad: isNaN(size) ? 4 : size,
		});
	}
	return res;
}

function parse_simbad_extended(data) {
	var lines = data.split(/\r?\n/);
	var res = [];
	for(var i = 0; i < lines.length; i++) {
		var toks = lines[i].trim().split(/[ \t]+/);
		var lng = parseFloat(toks[0]);
		var lat = parseFloat(toks[1]);
		var size= parseFloat(toks[2]);
		var typ = toks[4];
		var name= toks[5];
		var color = "#000";
		if(typ == "Rad") color = "#80f";
		if(isNaN(lat) || isNaN(lng)) continue;
		res.push({
			name: name,
			pos:  L.latLng(lat, lng),
			type: typ,
			size: size,
			info: "type " + typ + " size " + size,
			rad: isNaN(size) ? 3 : size,
			color: color,
		});
	}
	return res;
}

function parse_hyperleda(data) {
	var lines = data.split(/\r?\n/);
	var res = [];
	for(var i = 0; i < lines.length; i++) {
		var toks = lines[i].trim().split(/[ \t]+/);
		var name = toks[0];
		var typ  = toks[1];
		var lng = parseFloat(toks[2]);
		var lat = parseFloat(toks[3]);
		var size= parseFloat(toks[4]);
		var size2= parseFloat(toks[5]);
		var ang  = parseFloat(toks[6]);
		var mag= parseFloat(toks[7]);
		var color = "#000";
		if(typ == 'p') color = "#808";
		if(isNaN(lat) || isNaN(lng)) continue;
		res.push({
			name: name,
			pos:  L.latLng(lat, lng),
			type: typ,
			shape: "ellipse",
			size: size, size2: size2, ang: isNaN(ang) ? 0 : ang,
			info: "type " + typ + " size " + size + " " + size2 + " ang " + ang + " mag " + mag,
			rad: isNaN(size) ? 3 : size/2,
			rad2: isNaN(size2) ? 3 : size2/2,
			color: color,
		});
	}
	return res;
}


function parse_bounds(data) { 
	var lines = data.split(/\r?\n/);
	var res = [];
	for(var i = 0; i < lines.length; i++) {
		var toks   = lines[i].trim().split(/ +/);
		var id     = toks[0];
		var points = [];
		for(var j = 0; j < (toks.length-1)/2; j++) {
			var lng = parseFloat(toks[2*j+1]);
			var lat = parseFloat(toks[2*j+2]);
			points.push(L.latLng(lat,lng));
		}
		res.push({id: id, points:points})
	}
	return res;
}

function defbounds(url, tag) {
	var boundset = {tag:tag, vals:[null]};
	// Then set up the http request that will fetch the data
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.onreadystatechange = function(e) {
		if(this.readyState == 4 && this.status == 200) {
			var res = parse_bounds(this.responseText);
			for(var i = 0; i < res.length; i++) {
				var poly = L.polygon(res[i].points);
				poly.bindPopup(res[i].id);
				boundset.vals.push(poly);
			}
		}
	};
	xhr.send();
	return boundset;
}

L.CRS.CAR = L.extend({}, L.CRS, {
	projection: L.Projection.LonLat,
	// lat increases upwards, lon leftwards
	// lower-left corner is at (lat=-90,lon=80)
	transformation: new L.Transformation(-1,180,-1,90),
	// 120 pixels per degree at full resolution
	scale: function(t) { return 120 * Math.pow(2,t); },
	zoom:  function(t) { return Math.log(t/120)/Math.LN2; },
	wrapLng: [180,-180],
	infinite: false,
});
var crs = L.CRS.CAR;

function format_coord(x) { return x.toFixed(5); }

var maps = [];
function add_map(id, options) {
	var opts = {
		center: [0,0],
		zoom:   0,
		crs: crs,
		maxBounds: L.latLngBounds(
			L.latLng(-95,-720),
			L.latLng( 95, 720)),
		fadeAnimation: false,
		copyWorldJump: true,
	};
	if(options != null)
		for(key in options)
			opts[key] = options[key];
	var map = L.map(id, opts);
	maps.push(map);
	L.control.mousePosition({
		lngFormatter: format_coord,
		latFormatter: format_coord,
	}).addTo(map);
	return map;
}

// Associate a layer structure of the form
// {tag:tag, vals:[sub, sub, sub, ...]} with the given
// map, where tag is a string that is used in
// add_step, and sub can be either a layer from
// deflayer or a nested struct of the same kind
function add_layers(map, layers) {
	if(!("layer_groups" in map))
		map.layer_groups = [];
	map.layer_groups.push(layers);
}

function add_graticule(map, opts) {
	_opts = {tag: "graticule"};
	if(opts) for(key in opts) _opts[key] = opts[key];
	var group = {tag:_opts.tag,vals:[
		defgrat(_opts), null]};
	add_layers(map, group);
}

function add_cache(map, cache) {
	for(var i = 0; i < map.layer_groups.length; i++)
		add_cache_layer_group(map.layer_groups[i], cache);
}

function add_cache_layer_group(group, cache) {
	if(!group) return;
	if("tag" in group && "vals" in group) {
		for(var ind = 0; ind < group.vals.length; ind++)
			add_cache_layer_group(group.vals[ind], cache);
	} else {
		if("setCache" in group)
			group.setCache(cache);
	}
}

function update() {
	for(var i = 0; i < maps.length; i++)
		update_map(maps[i]);
}

function update_colors() {
	for(var i = 0; i < maps.length; i++)
		update_map_colors(maps[i]);
}

// The simplest way to update the visible layers is to remove all of them and then
// add back the ones we want. However, this leads to an annoying gray flicker.
// To avoid this we can try to:
// 1. Add all layers that need to be added
// 2. Remove layers that should be removed
// 3. Order the layers by using bring to back


function update_map(map) {
	// First remove all layers from map
	map.eachLayer(function(l) { map.removeLayer(l); });
	// Then add back layers as appropriate for each layer group
	for(var i = 0; i < map.layer_groups.length; i++)
		update_layer_group(map, map.layer_groups[i]);
}

function update_map_colors(map) {
	for(var i = 0; i < map.layer_groups.length; i++)
		update_layer_group_colors(map, map.layer_groups[i]);
}

function update_layer_group(map, group) {
	if(!group) return;
	if("tag" in group && "vals" in group) {
		var ind = 0;
		if(group.tag in steps)
			ind = mod(steps[group.tag].i,group.vals.length);
		var sub = group.vals[ind];
		update_layer_group(map, sub);
	} else {
		map.addLayer(group);
	}
}

function update_layer_group_colors(map, group) {
	if(!group) return;
	if("tag" in group && "vals" in group) {
		for(var ind = 0; ind < group.vals.length; ind++) {
			var sub = group.vals[ind];
			update_layer_group_colors(map, sub);
		}
	} else {
		if("setColors" in group) {
			var opts = { scale: get_scale() };
			var cmap = get_colmap();
			if(cmap) opts.colormap = cmap;
			console.log(group, cmap);
			group.setColors(opts);
		}
	}
}

/*
function find_active_layers(map) {
	var active = [];
	for(var i = 0; i < map.layer_groups.length; i++) {
		var layer = find_active_layer_group(map.layer_groups[i]);
		if(layer) active.push(layer);
	}
	return active;
}

function find_active_layer_group(group) {
	if(!group) return;
	if("tag" in group && "vals" in group) {
		var ind = 0;
		if(group.tag in steps)
			ind = mod(steps[group.tag].i,group.vals.length);
		return find_active_layer_group(group.vals[ind]);
	} else {
		return group;
	}
}

function update_map(map) {
	// add target layers
	var active = find_active_layers(map);
	console.log(["active",active]);
	for(var i = 0; i < active.length; i++) {
		if(!map.hasLayer(active[i])) {
			console.log(["add",active[i]]);
			map.addLayer(active[i]);
		}
	}
	// remove layers we don't want
	map.eachLayer(function(l) {
		if(!active.includes(l)) {
			console.log(["remove",l]);
			map.removeLayer(l);
		}
	});
	// sort layers
	for(var i = 0; i < active.length; i++) {
		console.log(["front",active[i],i,active.length]);
		active[i].bringToFront();
	}
}
*/

function fix_keys(keys) {
	var okeys = [];
	for(var j = 0; j < keys.length; j++)
		if(typeof keys[j] == 'string')
			okeys.push(keys[j].toUpperCase().charCodeAt(0));
	return okeys;
}

var steps = {};
// Associate keys = [inc,dec] with the given
// tag, and set i as the starting value in
// the sequence for that tag.
function add_step(tag, keys, i0) {
	i0 = i0 || 0;
	i  = i0;
	steps[tag] = {keys:fix_keys(keys), i:i, i0:i0};
}

var scales = {};
function add_scale(name, keys, factor) {
	scales[name] = {keys:fix_keys(keys), i:0, factor:factor};
}
function get_scale() {
	var scale = 1;
	for(var key in scales)
		scale *= Math.pow(scales[key].factor,scales[key].i);
	return scale;
}

var colmaps = null;
function set_colormaps(colormaps, keys, tag) {
	if(tag == null) tag = "colormap";
	colmaps = {colormaps:colormaps, i:0, keys:fix_keys(keys), tag:tag};
};
function get_colmap() {
	if(colmaps == null) return null;
	else return colmaps.colormaps[colmaps.i%colmaps.colormaps.length];
}

var bookmarks = {};
function add_bookmark(key, desc) {
	key = key.toUpperCase().charCodeAt(0);
	bookmarks[key] = desc;
}

function init() {
	// Initial update, so we are in a working state in case the stuff below fails
	update();
	// use window location to override initial state
	if(!location.search) return;
	if(location.search.substring(0,1) != "?") return;
	apply_bookmark(location.search.slice(1));
}

function apply_bookmark(desc) {
	var toks = desc.split("&");
	var lng  = null;
	var lat  = null;
	var zoom = null;
	for(var i = 0; i < toks.length; i++) {
		var sub = toks[i].split("=");
		if(sub.length != 2) continue;
		var key = sub[0];
		var val = sub[1];
		if     (key == "ra")   { lng  = parseFloat(val); }
		else if(key == "dec")  { lat  = parseFloat(val); }
		else if(key == "zoom") { zoom = parseInt(val);   }
		else {
			// Check the steps
			for(var name in steps) {
				if(key != name) continue;
				steps[key].i  = parseInt(val);
				steps[key].i0 = parseInt(val);
			}
			// Check the scales
			for(var name in scales) {
				if(key != name) continue;
				scales[key].i = parseInt(val);
			}
			// Check the colormap
			if(colmaps != null && key == colmaps.tag)
				colmaps.i = parseInt(val);
		}
	}
	// Apply the ra dec etc.
	for(var i = 0; i < maps.length; i++) {
		if(zoom != null) maps[i].setZoom(zoom);
		var center = maps[i].getCenter();
		if(lng != null) center.lng = lng;
		if(lat != null) center.lat = lat;
		maps[i].panTo(center);
	}
	// Update to reflect this
	update();
	update_colors();
}

var reset_key = "0".charCodeAt(0);
function set_reset(key) {
	if(key == null || key.length == 0)
		reset_key = 0;
	else
		reset_key = key.toUpperCase().charCodeAt(0);
}

function checkKey(e) {
	e = e || window.event;
	var changed = 0;
	var key = e.keyCode;
	for(var name in steps) {
		for(var i = 0; i < steps[name].keys.length; i++)
			if(key == steps[name].keys[i]) {
				steps[name].i += 1-2*i;
				changed = 1;
				break;
			}
	}
	for(var name in scales) {
		for(var i = 0; i < scales[name].keys.length; i++)
			if(key == scales[name].keys[i]) {
				scales[name].i += 1-2*i;
				update_colors();
				break;
			}
	}
	if(colmaps) {
		for(var i = 0; i < colmaps.keys.length; i++)
			if(key == colmaps.keys[i]) {
				colmaps.i += 1-2*i;
				update_colors();
				break;
			}
	}

	if(key == reset_key) {
		for(var name in steps) {
			steps[name].i = steps[name].i0;
			changed = 1;
		}
	}

	if(key in bookmarks)
		apply_bookmark(bookmarks[key]);
	if(changed) update();
}

document.addEventListener("keydown", checkKey);
window.addEventListener("load", init);
