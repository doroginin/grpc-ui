import React, {Component} from 'react';
import injectSheet from 'react-jss';
import Sidebar from './Sidebar';
import Method from './Method';
import Loader from './Loader';
import Error from './Error';

import './app.scss';
import axios from 'axios';
import qs from 'qs';


class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            error: null,
            addr: '',
            packages: [],
            types: {},
            enums: {},
        }
    }
    componentDidMount() {

    }
    handleSubmitHostForm(e) {
        e.preventDefault();

        this.setState({
            loading: true,
        });

        axios.get('/api/info?' + qs.stringify({addr: this.state.addr}))
            .then(({data: {data: {packages, types, enums}}}) => {
                this.setState({
                    packages, types, enums,
                    error: null,
                    loading: false,
                })
            })
            .catch(({response: {data: {error}}}) => {
                this.setState({
                    loading: false,
                    error: error,
                });
            });
    }
    render() {
        return (
            <div>
                <div className="navbar">
                    <div className="navbar__container">
                        <a href="" className="logo navbar__logo"/>

                        <form className="host-form navbar__host-form" action="" method="POST" onSubmit={this.handleSubmitHostForm.bind(this)}>
                            <input className="host-form__input" type="text" name="host"
                                   placeholder="Target grpc host address"
                                   value={this.state.addr}
                                   onChange={(e) => {
                                       this.setState({
                                          addr: e.target.value,
                                       });
                                   }}/>
                            <button className="button" type="submit">Connect</button>
                        </form>
                    </div>
                </div>
                <div className="app">
                    <div className="app__container">
                        {this.state.loading ?
                            <Loader />:
                                this.state.error ? <Error error={this.state.error} /> :
                                <div>
                                    <div className="app__sidebar">
                                        <Sidebar packages={this.state.packages}/>
                                    </div>
                                    <div className="app__packages-list">
                                        <div className="packages-list">
                                            {Object.keys(this.state.packages).map(package_name => {
                                                return this.state.packages[package_name].map((service) => {
                                                    return <div className="package">
                                                        <h3 className="package__title">{package_name + ' / ' + service.name}</h3>
                                                        {service.methods.map((method) =>
                                                            <Method key={method.name}
                                                                    {...method}
                                                                    addr={this.state.addr}
                                                                    service_name={service.name}
                                                                    package_name={package_name}
                                                                    types={this.state.types}
                                                                    enums={this.state.enums}
                                                            />
                                                        )}
                                                    </div>

                                                });
                                            })}
                                        </div>
                                    </div>
                                </div>
                        }
                    </div>
                </div>

            </div>
        );
    }
}


export default App;