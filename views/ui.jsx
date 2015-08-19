/*
  jsx --watch -x jsx . .
*/


var worker = new Worker("worker.js");

var Action = React.createClass({
  handleClick: function(){
    if(this.props.warn && !confirm(this.props.warn)) return;

    this.props.worker.postMessage({
      action: this.props.action
    })
  },
  render: function() {
    return <button className="btn btn-default" onClick={this.handleClick}>
      {this.props.action}
    </button>
  }
})

var Actions = React.createClass({
  render: function() {
    return <p className="actions">
      <Action {...this.props} action="start" /><span> </span>
      <Action {...this.props} action="resume" /><span> </span>
      <Action {...this.props} action="pause" /><span> </span>
      <Action {...this.props} action="clear" warn="this will destroy all data" />
    </p>;
  }
});

var Controller = React.createClass({
  getInitialState: function() {
    return {sofar:0, total:0};
  },
  componentDidMount: function() {
    this.props.worker.addEventListener('message', function(event){
      this.setState(event.data)
    }.bind(this))
  },
  render: function() {
    return <div>
      <h1>
        {/*<i className="glyphicon glyphicon-record"></i>*/}
        <span>{this.state.sofar}/{this.state.total}</span>
      </h1>
      <hr />
      <Actions worker={this.props.worker} />
    </div>;
  }
});

React.render(<Controller worker={worker} />, document.getElementById('ui'));
