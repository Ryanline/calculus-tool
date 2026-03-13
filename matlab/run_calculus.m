function run_calculus(inputPath, outputPath)
    payload = jsondecode(fileread(inputPath));
    expressionText = string(payload.expression);
    syms x

    try
        expression = str2sym(expressionText);
        derivativeExpr = diff(expression, x);
        integralExpr = int(expression, x);

        xValues = linspace(-10, 10, 400);
        expressionPoints = samplePoints(expression, x, xValues);
        derivativePoints = samplePoints(derivativeExpr, x, xValues);
        integralPoints = samplePoints(integralExpr, x, xValues);

        result = struct();
        result.expression = char(expression);
        result.derivative = char(derivativeExpr);
        result.integral = append(char(integralExpr), ' + C');
        result.graphs = struct( ...
            'expression', expressionPoints, ...
            'derivative', derivativePoints, ...
            'integral', integralPoints ...
        );

        writeOutput(outputPath, result);
    catch errorInfo
        result = struct();
        result.error = string(errorInfo.message);
        writeOutput(outputPath, result);
        rethrow(errorInfo);
    end
end

function points = samplePoints(expr, variable, xValues)
    yValues = double(subs(expr, variable, xValues));
    if ~isvector(yValues)
        yValues = double(arrayfun(@(value) subs(expr, variable, value), xValues));
    end

    yValues = real(yValues);
    yValues(~isfinite(yValues)) = NaN;
    points = repmat(struct('x', 0, 'y', 0), 1, numel(xValues));

    for index = 1:numel(xValues)
        points(index).x = xValues(index);
        if isnan(yValues(index))
            points(index).y = 0;
        else
            points(index).y = yValues(index);
        end
    end
end

function writeOutput(outputPath, data)
    jsonText = jsonencode(data);
    fileId = fopen(outputPath, 'w');
    cleaner = onCleanup(@() fclose(fileId));
    fprintf(fileId, '%s', jsonText);
end
