/***************************************************************************
    Copyright 2012 Matthew S. Estes

    This file is part of templates.js

    templates.js is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, under version 3 of the License.

    templates.js is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with templates.js.  If not, see <http://www.gnu.org/licenses/>.
***************************************************************************/

(function (window, undefined) {
function eta(that, methodName) {
	var f = that[methodName];
	return function () { return f.apply(that,arguments); };
};

/* The identity function. */
function I(x) { return x; };

/* Convert the "name value" form data objects "[ { name, value }, ... ]" to a "simple" object "{ name: value, ... }" */
function cvtNVArrayToObj(arr, $) {
	var r = { };
	arr.map(function (nv) {
		if(nv.name in r) {
			if($.isArray(r[nv.name])) {
				r[nv.name].push(nv.value);
			} else {
				r[nv.name] = [ r[nv.name], nv.value ];
			}
		} else {
			r[nv.name] = nv.value;
		}
	});
	return r;
};

/* Transpose an object of arrays to an array of objects */
function transpose(o) {
	var keys = [ ];
	var ret = [ ];
	for(n in o) { keys.push(n); }
	for(i in o[keys[0]]) {
		var r = { };
		for(k in keys) {
			r[keys[k]] = o[keys[k]][i];
		}
		ret.push(r);
	}
	return ret;
};

/* Replace all methods of iface with the version from obj */
function interfaceAdapter(iface, obj) {
	for(m in iface) {
		if((m in obj) && (typeof obj[m] === 'function')) {
			iface[m] = eta(obj, m);
		}
	}
	return iface;
};

function delegateAdapter(delegate, obj) {
	for(m in delegate) {
		if(!(m in obj)) {
			obj[m] = eta(delegate, m);
		}
	}
};

/* This is a function to generate a function to map an array of function objects in sequence.
	It checks to see if the browser is online, if it is, it executes the current step in the sequence, if not,
	it waits retryTimeout milliseconds. The function it calls MUST return a deferred object.
	Whatever "data" is returned by the "done" event will then be passed to the next function in the chain.
	This is probably a monad or could be rewritten more cleanly as one, but I haven't figured that out yet. */
function onlineRetrySequenceResolution(arr, retryTimeout, promise) {
	return {
			next: function () { 
					if(this.i < arr.length) {
						arr[this.i](this.data).done(eta(this, 'handleDone')).fail(eta(this,'handleFail'));
					} else {
						promise.resolve(this.data);
					}
				},
			handleDone: function (d) {
					this.i++;
					this.data = d;
					this.next();
				},
			handleFail: function() { if(retryTimeout != null) { window.setTimeout(eta(this, 'next'), retryTimeout); } },
			resolve: function(d) {
					this.i = 0;
					this.data = d;
					this.next();
				}
		};
};
function LiftToPromise(f) {
	return function (d) {
			var data = f(d);
			return {
					done: function (next) {
							next(data);
							return this;
						},
					fail: function (next) { return this; }
				};
		};
};

/*	Convert a JSON description of an API in to an object that makes $.ajax calls
	The format expected is { methodName: { method: m, uri: url, mime: type, result: expectedMimeReturn  }, method2: ... }
	mime and/or result may be omitted. The default assumed mime type is form encoding, and the default expected
	result is text. */
function createAPI(api, $) {
	var o = { };
	for(var i in api) {
		(function (i, v) {
			if('uri' in v) {
				v.mime = ('mime' in v) ? v.mime : 'application/x-www-form-urlencoded';
				v.result = ('result' in v) ? v.result: 'text';
				o[i] = function (params) {
					return $.ajax({	type: v.method,
								url: v.uri,
								data: params,
								dataType: v.result,
								contentType: v.mime });
				};
			}
		})(i, api[i]);
	};
	return o;
}

/* Parse query string parameters into a hash object. */
function GetParams($) {
	return function() {
		var pairs = window.location.search.substring(1).split('&').map(function (e) { return e.split(';'); });
		var flatPairs = [];
		pairs.map(function (e) { e.map(function(e) { flatPairs.push(e); }); });
		flatPairs = flatPairs.map(function (e) {
												var e2 = e.split('=');
												if(e2.length > 1) { 
													return { name: e2[0], value: decodeURIComponent(e2[1].replace(/\+/g, " ")) }; 
												} else {
													return { name: e2[0], value: '' };
												}
											});
		return cvtNVArrayToObj(flatPairs, $);
	};
};
/* This is a utility function to handle the case where the user already has a div pre-loaded with templates, and needs
to "load" them by just collecting the class names. To use this, you would just say:
	var templateObj = makeTemplateObj({ loader: InlineTemplates, id: '#mycontainer', ... });
*/
var InlineTemplateLoader = function(id, templates) {
	$(id).children('div').each(function () { templates[$(this).attr('class')] = this; });
};

var makeTemplates = function(opts) {
	return (function(context) {
		return {
			makeFormHandler: function (handler) {
					return function (sel, el, data) {
						el.submit(function(e) { return handler(e, this, sel, el, data); });
					};
				},
			makeDialogHandler: function (dialogName) {
					var that = this;
					return function(sel, el, data) {
							el.toggle(function () {
												console.log('make dialog "' + dialogName + '"');
												that.templates[dialogName](sel, data);
												return false;
											},
										function () {
												var d = sel.find('.' + dialogName);
												d.remove();
												return false;
											});
											
						};
				},
			makeListHandler: function (listItemTemplate, filter) {
					if(arguments.length < 2) { filter = I; }
					var that = this;
					return function(sel, el, data) { filter(data).map(function (d) { that.templates[listItemTemplate](el, d); }); };
				},
			ClickRemove: function(sel, el, data) {
					sel.click(function(e) { 
							sel.remove(); 
							return false; 
						});
				},
			Up:		function (sel, el, data) { el.click(function () { sel.prev().before(sel); }); },
			Down:	function (sel, el, data) { el.click(function () { sel.next().after(sel); }); },
			SetInputs: function (getParams, names) {
					if(arguments.length == 0) { getParams = I; }
					if(arguments.length < 2) {
						return function (sel, el, data) {
								var params = getParams(data);
								for(n in params) {
									sel.find('[name=' + n + ']').val(params[n]);
								};
							};
					} else {
						return function (sel, el, data) {
							var params = getParams(data);
							names.map(function(n) {
									if(n in params) {
										sel.find('[name=' + n + ']').val(params[n]);
									};
								});
						};
					}
				},
			AddFormHandlers: function (obj, formHandlers, api) {
					for(form in formHandlers) {
						(function(form) {
							obj[form] = function (e, that, sel, el, data) {
									var f = cvtNVArrayToObj($(e.target).serializeArray(), $);
									if('validate' in formHandlers[form]) {
										for(v in formHandlers[form].validate) {
											if(!(formHandlers[form].validate[v])(sel, el, f, data)) { return false; }
										}
									}
									api[form](f)
										.done(formHandlers[form].done(f, sel, el, data))
										.fail(formHandlers[form].fail(f, sel, el, data));
									return false;
								};
						})(form);
					}
				},
			loadTemplates: function (uri) {
					context.child = this;
					return context.loaderPromise(uri);
				}
		};
	})((function() {
		return {
			/* Hash of templates: key is template name, value is jQuery wrapped DOM object. */
			templates: { },
			forms: { },

//			addHandlers: function (sel, el, handlers) {
			addHandlers: function (sel, handlers, data) {
					for(s in handlers) {
						var el = sel.find(s);
						for(h in handlers[s]) {
							handlers[s][h](sel, el, data);
						}
					}
					return el;
				},
			MakeTemplates: function (templates, handlers) {
					this.child.templates = { };
					var o = this.child.templates;
					for(t in templates) {
						(function (t,context) {
							if(t in handlers) {
								o[t] = function(sel, data) {
//										sel.append(context.addHandlers(sel, $(templates[t]).clone(), handlers[t]));
//										sel.append($(templates[t]).clone());
										var el = $(templates[t]).clone();
										context.addHandlers(el, handlers[t], data);
										sel.append(el);
									};
							} else {
								o[t] = function(sel) {
										sel.append($(templates[t]).clone());
									};
							}
						})(t, this);
					};
				},

			/* Attempt to load the template HTML and store it in a hidden div. 
				If this fails, wait a few minutes and try again. If it succeeds, resolve the API start up deferred object
				so requests will start going through. */
			loadTemplates: function(templateURI) {
					console.log('load templates ' + templateURI);
					return $.ajax({	url:  templateURI, 
											dataType: 'html' });
				},
			handleTemplates: function (data) {
					console.log('loading templates');
					var that = this;
					$(this.id).append(data);
					$(this.id + ' :first-child ').children('div').each(function () { that.templates[$(this).attr('class')] = this; });
					this.MakeTemplates(this.templates, this.handlers(this.child, this.templates, this.forms));
				},
			loaderPromise: function(uri) {
					var p = $.Deferred();
					onlineRetrySequenceResolution([	this.loadTemplates,
																	LiftToPromise(eta(this, 'handleTemplates'))], this.failRetry, p).resolve(uri);
					return p;
				},
			loaderUser: function (uri) {
					var ret = this.loader(this.id, this.templates);
					this.MakeTemplates(this.templates, this.handlers(this.child, this.templates, this.forms));
					return ret;
				},

			init: function(opts) {
					this.id = ('id' in opts) ? opts.id : '#templates'; 
					this.handlers = ('handlers' in opts) ? opts.handlers : function () { return { }; };
					this.failRetry = ('failRetry' in opts) ? opts.failRetry : 60000; // Default is 1 minute.
					this.loaderPromise = ('loader' in opts) ? ((this.loader = opts.loader), LiftToPromise(eta(this, 'loaderUser'))) : this.loaderPromise;
					return this;
				}
		};
	})().init(opts));
};
window.InlineTemplateLoader = InlineTemplateLoader;
window.makeTemplates = makeTemplates;
})(this);
