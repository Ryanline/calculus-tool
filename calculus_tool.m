function result = calculus_tool(expressionText)
%CALCULUS_TOOL Calculate the derivative, integral, and graph samples.
%   RESULT = CALCULUS_TOOL(EXPRESSIONTEXT) returns a struct containing the
%   original symbolic expression, derivative, integral, and graph points.

    if nargin == 0
        expressionText = "sin(x)";
    end

    syms x
    expression = str2sym(expressionText);
    derivativeExpr = diff(expression, x);
    integralExpr = int(expression, x);
    xValues = linspace(-10, 10, 400);

    result = struct();
    result.expression = char(expression);
    result.derivative = char(derivativeExpr);
    result.integral = append(char(integralExpr), ' + C');
    result.x = xValues;
    result.y = double(subs(expression, x, xValues));
    result.derivativeY = double(subs(derivativeExpr, x, xValues));
    result.integralY = double(subs(integralExpr, x, xValues));
end
