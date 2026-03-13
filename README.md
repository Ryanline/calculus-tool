# Calculus Tool

This is a local calculus web app built with React, Node, and MATLAB.

It takes a function from the user, shows the derivative and integral, and draws three graphs:

- integral
- original function
- derivative

## What You Need

- Node.js 22+
- MATLAB installed locally
- Symbolic Math Toolbox

## Setup

1. Open the project folder in a terminal.
2. Install packages:

```powershell
npm install
npm run install:all
```

## Run It

1. Start the backend:

```powershell
$env:MATLAB_PATH="F:\\dev\\tools\\bin\\matlab.exe"
npm run dev:backend
```

2. In a second terminal, start the frontend:

```powershell
npm run dev:frontend
```

3. Open `http://localhost:3000`

## How To Use It

1. Type a function like `sin(x)`, `x^2`, or `sin(x)cos(x)`.
2. Click `solve`.
3. Read the function, derivative, and integral above the graphs.

## How It Works

- React handles the page and graphs.
- The Node backend receives the function input.
- The backend sends the function to MATLAB.
- MATLAB converts the text input into a symbolic expression using the Symbolic Math Toolbox.
- MATLAB uses that symbolic expression to compute the derivative and integral.
- MATLAB evaluates those expressions across a range of x-values to generate graph points.
- The frontend displays the results in the browser.
