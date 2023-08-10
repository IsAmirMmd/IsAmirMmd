import React from "react";
import ReactDOM from "react-dom";
import "./style.css";

ReactDOM.render(
  <div>
    <h1 className="text">
      Hello World - {process.env.NODE_ENV}
      <p>{process.env.NAME}</p>
    </h1>
  </div>,
  document.getElementById("root")
);
