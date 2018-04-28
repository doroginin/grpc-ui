import React, { Component } from 'react';
import axios from 'axios/index';
import JSONTree from 'react-json-tree';
import Request from './Request';
import Response from './Response';
import './Method.scss';

class Method extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      expanded: false,
      result: '',
      error: ''
    };
  }
  onHeadingClick = () => {
    this.setState({
      expanded: !this.state.expanded
    });
  };
  handleInvokeMethod = args => {
    this.setState({
      error: '',
      result: '',
      loading: true
    });

    axios
      .post('/api/invoke', {
        package_name: this.props.package_name,
        service_name: this.props.service_name,
        method_name: this.props.name,
        addr: this.props.addr,
        grpc_args: args
      })
      .then(resp => {
        this.setState({
          result: resp.data.data,
          loading: false
        });
      })
      .catch(error => {
        if (error.response) {
          this.setState({
            error: error.response.data.error,
            loading: false
          });
        } else {
          this.setState({
            error,
            loading: false
          });
        }
      });
  };
  render() {
    const theme = {
      scheme: 'bright',
      author: 'chris kempson (http://chriskempson.com)',
      base00: '#000000',
      base01: '#303030',
      base02: '#505050',
      base03: '#b0b0b0',
      base04: '#d0d0d0',
      base05: '#e0e0e0',
      base06: '#f5f5f5',
      base07: '#ffffff',
      base08: '#fb0120',
      base09: '#fc6d24',
      base0A: '#fda331',
      base0B: '#a1c659',
      base0C: '#76c7b7',
      base0D: '#04acb4',
      base0E: '#d381c3',
      base0F: '#be643c'
    };

    return (
      <div className={`method ${this.state.loading ? 'method--loading' : ''}`}>
        <div className="method__heading" onClick={this.onHeadingClick}>
          <h4 className="method__name">
            {' '}
            {this.props.name}{' '}
            <i className={this.state.expanded ? '' : 'fa fa-angle-down'} />
          </h4>
        </div>

        <div
          className="method__body"
          style={{ display: this.state.expanded ? 'block' : 'none' }}
        >
          <Request
            type_name={this.props.in}
            types={this.props.types}
            enums={this.props.enums}
            onInvokeMethod={this.handleInvokeMethod}
          />
          {this.state.error ? (
            <div className="method__error">{this.state.error}</div>
          ) : null}
          {this.state.result ? (
            <div className="method__result">
              <JSONTree data={this.state.result} theme={theme} />
            </div>
          ) : null}

          <Response
            type_name={this.props.out}
            types={this.props.types}
            enums={this.props.enums}
          />
        </div>
      </div>
    );
  }
}

export default Method;
