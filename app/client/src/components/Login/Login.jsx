
import React, { Component } from 'react';
import Navbar from '../Navbar/Navbar';
import './Login.css';

export default class Login extends Component {
   constructor(props) {
      super(props);
      this.state = {
         username: 'admin@example.com',
         password: 'password'
      };

      if (this.props.User.isLoggedIn) {
         console.log('User is logged in; sending to /home');
         this.props.history.push('/home')
      }

      this.handleChange = this.handleChange.bind(this)
   }

   handleChange(event) {
      this.setState({[event.target.name]: event.target.value});
      console.log("New state:", this.state);
   }

   submit() {
      console.log('Logging in');
      let creds = { email: this.state.username, password: this.state.password };
      this.props.login(creds, () => this.props.history.push('/home'));
   }

   render() {
      return (
         <div>
            <Navbar {...this.props} />
            
            <div className="login-wrapper">
               <h1>Login</h1>
               <div className="login-body">
                  <input type="text" placeholder="Username" name="username" onKeyUp={this.handleChange} />
                  <input type="password" placeholder="Password" name="password" onKeyUp={this.handleChange} />
                  <button type="button" onClick={() => this.submit()}>Submit</button>
               </div>
            </div>
         </div>
      )

   }
}
