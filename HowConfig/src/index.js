import React from "react";
import ReactDOM from "react-dom";
import "./style.css";

ReactDOM.render(
  <h1 className="text">Hello World - {process.env.NODE_ENV}</h1>,
  document.getElementById("root")
);
