/*
  jsx --watch -x jsx . .
*/


var worker = new Worker("worker.js");

var Action = React.createClass({displayName: "Action",
  handleClick: function(){
    if(this.props.warn && !confirm(this.props.warn)) return;

    this.props.worker.postMessage({
      action: this.props.action
    })
  },
  render: function() {
    return React.createElement("button", {className: "btn btn-default", onClick: this.handleClick}, 
      this.props.action
    )
  }
})

var Actions = React.createClass({displayName: "Actions",
  render: function() {
    return React.createElement("p", {className: "actions"}, 
      React.createElement(Action, React.__spread({},  this.props, {action: "start"})), React.createElement("span", null, " "), 
      React.createElement(Action, React.__spread({},  this.props, {action: "resume"})), React.createElement("span", null, " "), 
      React.createElement(Action, React.__spread({},  this.props, {action: "pause"})), React.createElement("span", null, " "), 
      React.createElement(Action, React.__spread({},  this.props, {action: "clear", warn: "this will destroy all data"}))
    );
  }
});

var Controller = React.createClass({displayName: "Controller",
  getInitialState: function() {
    return {sofar:0, total:0};
  },
  componentDidMount: function() {
    this.props.worker.addEventListener('message', function(event){
      this.setState(event.data)
    }.bind(this))
  },
  render: function() {
    return React.createElement("div", null, 
      React.createElement("h1", null, 
        /*<i className="glyphicon glyphicon-record"></i>*/
        React.createElement("span", null, this.state.sofar, "/", this.state.total)
      ), 
      React.createElement("hr", null), 
      React.createElement(Actions, {worker: this.props.worker})
    );
  }
});

React.render(React.createElement(Controller, {worker: worker}), document.getElementById('ui'));
