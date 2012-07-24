# templates.js
This is a minimalistic templating library built on jQuery with external loading of templates from mostly plain HTML files(or inline template loading from a hidden block). This library gives you an object whose methods are the names of your templates, and they accept two parameters: a jQuery selector to .append() the template instance to, and an optional data object to be used by your template handlers.

## Licensing.
This project is licensed under the [AGPL version 3](http://www.gnu.org/licenses/agpl.html), which means if you want to use this in your project, you must release your code under an AGPL compatible license. The Free Software Foundation has a [List of licenses compatible with the AGPL](www.gnu.org/licenses/index_html#GPLCompatibleLicenses). If you would like to use this code in a commercial project, you can as long as you release your code under the AGPL. If you are interested in using this code under alternative licensing, email me [matt.estes@metanotion.net](mailto:matt.estes@metanotion.net) and I will be happy to work with you.

## Getting Started
A template is just a chunk of HTML with a css class denoting the name of the template:
```html
<div>
 <div class='template1'>
  your html goes here.
 </div>
 ...
</div>
```

The library exports two functions:
InlineTemplateLoader
makeTemplates(opts)

To instantiate a template object, you would say
```javascript
// A normal template object with externally loaded templates
var templateObject = makeTemplates({ id: '#MyHiddenDiv', handlers: myHandlerFunction });
var promise = templateObject.loadTemplates('uri/to/my/templates.html');
promise.done(function () { console.log('now you can use the templates!'); });

// An inline template object.
var templateObject2 = makeTemplates({ id: '#MyHiddenDiv2', handlers: myHandlerFunction2, loader: InlineTemplateLoader });
templateObject2.loadTemplates();

// Using a template named 'foo'
templateObject.templates.foo($('#placeToPutFoo'), { bar: 'baz', rows: [ 'fe', 'fi', 'fo', 'fum' ] });

// How to write the handler function
function myHandlerFunction(templateObj, arrayOfTemplates) {
	return {
		templateName1: {
				jQueryCSSSelector: [ function1, function2, function3 ],
				'.templateName1': [ templateObj.SetInputs ],
				'[name=MyButton]': [ function(templateInstance, elementSelectedBySelector, data) {
							elementSelectedBySelector.click(function (event) {
									console.log('Button clicked');
									console.log(data);
								});
						} ]
			},
		templateName2: {
			},
		// more template names, corresponds to elements in your template with class='templateName'
	};
};
```
The template handler function provides the template library with a list of things to do for css selectors in the given template when creating an instance. templates are referenced on the object "templateObjectInstance.templates.templateName", and there are several behaviors already available on "templateObjectInstance": makeListHandler, makeDialogHandler, makeListHandler, Up, Down, SetInputs, ClickRemove. This list is growing though.

I realize this documentation is lacking, but I thought it would be useful to release this code