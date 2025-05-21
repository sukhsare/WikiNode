// simple mocks of the vis.js classes for testing
export class DataSet {
    constructor(items) {
      this.items = items || [];
    }
    add(item) { this.items.push(item); }
    get() { return this.items; }
    update() {}
    remove() {}
    forEach(callback) { this.items.forEach(callback); }
  }
  
  export class Network {
    constructor(container, data, options) {
      this.container = container;
      this.data = data;
      this.options = options;
    }
  
    setOptions() {}
    fit() {}
    once() {}
    on() {}
    redraw() {}
    cluster() {}
    openCluster() {}
    unselectAll() {}
  
    body = {
      nodes: {}
    }
  }