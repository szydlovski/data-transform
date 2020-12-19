const {
	setDeepProperty,
	extractDeepProperty,
	DeepPropertyError,
} = require('@szydlovski/deep-property');

function extractProperty(sourceObject, path) {
	if (path === null) {
		return [true, sourceObject];
	} else {
		return extractDeepProperty(sourceObject, path);
	}
}

function extractCombinedProperties(sourceObject, instruction) {
	const extracts = instruction.paths.map((path) =>
		extractProperty(sourceObject, path)
	);
	const allExist = extracts.reduce((state, [exists]) => state && exists, true);
	if (!allExist) {
		return [false, undefined];
	}
	const allValues = extracts.reduce(
		(values, [, value]) => [...values, value],
		[]
	);
	const value = instruction.combine
		? instruction.combine(...allValues)
		: allValues;
	return [true, value];
}

function isObject(value) {
	return typeof value === 'object' && value !== null;
}

function isFunction(value) {
	return typeof value === 'function';
}

function isString(value) {
	return typeof value === 'string';
}

function isArray(value) {
	return Array.isArray(value);
}

function stringifyPath(path) {
	if (isArray(path)) {
		return path.join(' => ');
	} else if (isString(path)) {
		return stringifyPath(path.split('.'));
	} else if (isObject(path)) {
		return path.paths.map(path => `[${stringifyPath(path)}]`).join(',');
	}
}

class DataTransformError extends Error {
	constructor(message, instruction) {
		super(message);
		this.instruction = instruction;
	}
}

function throwUnexpectedError(error) {
	console.warn(`This error should not happen.`);
	throw error;
}

function transformDataFactory(instructions) {
	return function(sourceObject, options = {}) {
		return transformData(sourceObject, instructions, options);
	}
}

function transformData(sourceObject, instructions, options = {}) {
	options = Object.assign({
		warn: false,
	}, options);
	// if the source is an array, map it using provided instructions
	if (Array.isArray(sourceObject)) {
		return sourceObject.map((sourceElement) =>
			transformData(sourceElement, instructions, options)
		);
	}

	// allow for single instructions given as an object
	if (!Array.isArray(instructions)) {
		instructions = [instructions];
	}

	if (!isObject(sourceObject) && !isArray(sourceObject)) {
		throw new DataTransformError('Source must be an object or an array');
	}

	// build the result object
	const resultObject = {};
	for (const instruction of instructions) {
		// instruction validation
		if (
			instruction.transform !== undefined &&
			!isFunction(instruction.transform)
		) {
			throw new DataTransformError('Transform is not a function', instruction);
		}
		if (instruction.from === undefined) {
			throw new DataTransformError('Must supply "from" key path', instruction);
		}
		if (instruction.to === undefined) {
			throw new DataTransformError('Must supply "to" key path', instruction);
		}

		// extract value from source
		const combinedSource =
			instruction.from !== null && instruction.from.paths !== undefined;

		let sourceValueExists, sourceValue;

		try {
			[sourceValueExists, sourceValue] = combinedSource
				? extractCombinedProperties(sourceObject, instruction.from)
				: extractProperty(sourceObject, instruction.from);
		} catch (error) {
			if (error instanceof DeepPropertyError) {
				throw new DataTransformError(
					`In "from": ${error.message}`,
					instruction
				);
			} else {
				throwUnexpectedError(error);
			}
		}

		let resultValue;

		if (sourceValueExists) {
			// source value exists, apply nested instructions and transform
			resultValue = sourceValue;
			if (instruction.instructions) {
				resultValue = transformData(
					resultValue,
					instruction.instructions,
					options
				);
			}
			if (instruction.transform) {
				resultValue = instruction.transform(
					resultValue,
					resultObject,
					sourceObject
				);
			}
		} else {
			if (options.warn) {
				console.warn(`Value does not exist at: ${stringifyPath(instruction.from)}`)
			}
			if (instruction.default !== undefined) {
				// source value does not exist, try default
				resultValue = instruction.default;
			} else {
				// no source value and no default
				resultValue = undefined;
			}
		}

		// set property or assign
		if (instruction.to === null) {
			if (!isObject(resultValue)) {
				throw new DataTransformError(
					'Cannot assign properties from a non-object',
					instruction
				);
			}
			Object.assign(resultObject, resultValue);
		} else {
			try {
				setDeepProperty(resultObject, instruction.to, resultValue);
			} catch (error) {
				if (error instanceof DeepPropertyError) {
					throw new DataTransformError(
						`In "to": ${error.message}`,
						instruction
					);
				} else {
					throwUnexpectedError(error);
				}
			}
		}
	}
	return resultObject;
}

module.exports = { transformData, transformDataFactory, DataTransformError };
