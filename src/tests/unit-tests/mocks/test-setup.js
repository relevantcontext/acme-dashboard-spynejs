// test-setup.js (an example name)
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
  url: 'http://localhost/',
});

global.window = dom.window;
global.document = dom.window.document;

// If you need other globals like navigator, location, etc.:
//global.navigator = dom.window.navigator;
