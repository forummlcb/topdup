import React, { useState, useRef } from "react";
import PropTypes from "prop-types";

import "./Login.css";
import { getToken } from "./Login.service";
import FacebookLogin from 'react-facebook-login';
import {TiSocialFacebookCircular} from 'react-icons/ti';

export default function Login({ setToken }) {
  const [username, setUsername] = useState();
  const [password, setPassword] = useState();
  const mounted = useRef(true);

  const handleSubmit = async e => {
    e.preventDefault();
    getToken({ username, password }).then(tokenObj => {
      if (mounted.current) {
        setToken(tokenObj);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Sign In</h3>
      <div className="form-group">
        <label>Username</label>
        <input
          type="text"
          className="form-control"
          placeholder="Enter username"
          onChange={e => setUsername(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          className="form-control"
          placeholder="Enter password"
          onChange={e => setPassword(e.target.value)}
        />
      </div>

      <div className="form-group">
        <div className="custom-control custom-checkbox">
          <input
            type="checkbox"
            className="custom-control-input"
            id="customCheck1"
          />
          <label className="custom-control-label" htmlFor="customCheck1">
            Remember me
          </label>
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-block">
        Submit
      </button>
        <FacebookLogin
            appId="800436117349613"
            autoLoad={true}
            fields="name,email,picture"
            cssClass={"btn btn-primary btn-block mt-2"}
            icon={<TiSocialFacebookCircular />}
        />
      <p className="forgot-password text-right">
        Forgot <a href="#">password?</a>
      </p>
    </form>
  );
}

Login.propTypes = {
  setToken: PropTypes.func.isRequired
};
