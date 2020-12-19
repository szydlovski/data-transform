const { expect } = require('chai');
const {
	transformData,
	transformDataFactory,
	DataTransformError,
} = require('./../src/data-transform.js');

describe('transformData', function () {
	it('transforms objects', function () {
		const sourceObject = {
			firstName: 'John',
			lastName: 'Doe',
			address: {
				streetName: 'Tanglewood Drive',
				country: {
					code: 'CA',
				},
			},
		};
		const instructions = [
			{
				from: 'firstName',
				to: 'name',
			},
			{
				from: 'lastName',
				to: 'surname',
			},
			{
				from: 'address.streetName',
				to: 'street',
			},
			{
				from: 'address.country.code',
				to: 'countryCode',
			},
		];
		const expectedResultObject = {
			name: 'John',
			surname: 'Doe',
			street: 'Tanglewood Drive',
			countryCode: 'CA',
		};
		const resultObject = transformData(sourceObject, instructions);
		expect(resultObject).to.deep.equal(expectedResultObject);
	});
	it('transforms arrays', function () {
		const sourceArray = [
			{
				nickname: 'Charlie',
				details: {
					breed: 'terrier',
				},
			},
			{
				nickname: 'Rosie',
				details: {
					breed: 'pitbull',
				},
			},
		];
		const instructions = [
			{
				from: 'nickname',
				to: 'petName',
			},
			{
				from: 'details.breed',
				to: 'breedName',
			},
		];
		const expectedResultArray = [
			{
				petName: 'Charlie',
				breedName: 'terrier',
			},
			{
				petName: 'Rosie',
				breedName: 'pitbull',
			},
		];
		const resultArray = transformData(sourceArray, instructions);
		expect(resultArray).to.deep.equal(expectedResultArray);
	});
	it('accepts an array as instructions', function () {
		const sourceObject = {
			name: 'Amanda',
		};
		const instructions = [
			{
				from: 'name',
				to: 'firstName',
			},
		];
		const expectedResultObject = {
			firstName: 'Amanda',
		};
		const resultObject = transformData(sourceObject, instructions);
		expect(resultObject).to.deep.equal(expectedResultObject);
	});
	it('accepts an object as instructions', function () {
		const sourceObject = {
			name: 'Amanda',
		};
		const instructions = {
			from: 'name',
			to: 'firstName',
		};
		const expectedResultObject = {
			firstName: 'Amanda',
		};
		const resultObject = transformData(sourceObject, instructions);
		expect(resultObject).to.deep.equal(expectedResultObject);
	});
	it('handles complex transformations', function () {
		const sourceObject = {
			orderId: '1443',
			dateCreated: '2019-10-23',
			shipping: {
				giftWrap: undefined,
			},
			customer: {
				firstName: 'Maria',
				lastName: 'Lopez',
				shippingAddress: {
					streetName: 'Harrison Avenue',
					streetNumber: '23A',
					zipCode: '122-332',
					cityName: 'Dayton',
					provinceData: {
						code: 'AZ',
					},
				},
			},
			items: [
				{
					name: 'Surround Speakers',
					sku: 'YX022134',
					price: 32.95,
				},
				{
					name: 'Blue Carpet with Magnolias',
					sku: 'ZU129833',
					price: 99.95,
				},
			],
		};
		const instructions = [
			{
				from: {
					paths: ['customer.shippingAddress', null],
					combine: (address, $root) => ({ ...address, $root }),
				},
				to: null,
				instructions: [
					{
						from: {
							paths: [
								'streetName',
								'streetNumber',
								'zipCode',
								'cityName',
								'provinceData.code',
								'$root.customer.firstName',
								'$root.customer.lastName',
							],
							combine: (street, number, zip, city, province, fname, lname) =>
								`${fname} ${lname}, ${number} ${street}, ${zip} ${city} ${province}`,
						},
						to: 'fullAddress',
						transform: (str) => 'Ship to: ' + str,
					},
				],
			},
			{
				from: 'items',
				to: 'totalPriceCents',
				transform: (items) =>
					items.reduce(
						(total, { price }) => total + Math.round(price * 100),
						0
					),
			},
		];
		const expectedResultObject = {
			fullAddress:
				'Ship to: Maria Lopez, 23A Harrison Avenue, 122-332 Dayton AZ',
			totalPriceCents: 13290,
		};
		const resultObject = transformData(sourceObject, instructions);
		expect(resultObject).to.deep.equal(expectedResultObject);
	});
	context('basic instructions', function () {
		it('applies nested instructions', function () {
			const sourceObject = {
				firstName: 'John',
				address: {
					streetName: 'Tanglewood Drive',
					country: {
						code: 'CA',
					},
				},
			};
			const instructions = [
				{
					from: 'firstName',
					to: 'name',
				},
				{
					from: 'address',
					to: 'addressData',
					instructions: [
						{
							from: 'streetName',
							to: 'street',
						},
						{
							from: 'country.code',
							to: 'countryCode',
						},
					],
				},
			];
			const expectedResultObject = {
				name: 'John',
				addressData: {
					street: 'Tanglewood Drive',
					countryCode: 'CA',
				},
			};
			const resultObject = transformData(sourceObject, instructions);
			expect(resultObject).to.deep.equal(expectedResultObject);
		});
		it('uses entire source as local source if from:null', function () {
			const sourceObject = {
				firstName: 'John',
				address: {
					streetName: 'Tanglewood Drive',
					country: {
						code: 'CA',
					},
				},
			};
			const instructions = [
				{
					from: null,
					to: 'copy',
				},
			];
			const expectedResultObject = {
				copy: {
					firstName: 'John',
					address: {
						streetName: 'Tanglewood Drive',
						country: {
							code: 'CA',
						},
					},
				},
			};
			const resultObject = transformData(sourceObject, instructions);
			expect(resultObject).to.deep.equal(expectedResultObject);
		});
		it('assigns properties from nested instructions if to:null', function () {
			const sourceObject = {
				favorites: {
					food: 'Pizza',
				},
			};
			const instructions = [
				{
					from: 'favorites',
					to: null,
					instructions: {
						from: 'food',
						to: 'favoriteFood',
					},
				},
			];
			const expectedResultObject = {
				favoriteFood: 'Pizza',
			};
			const resultObject = transformData(sourceObject, instructions);
			expect(resultObject).to.deep.equal(expectedResultObject);
		});
		it('uses default values if the source key is not set', function () {
			expect(
				transformData(
					{},
					{
						from: 'foo',
						to: 'bar',
						default: 'baz',
					}
				)
			).to.deep.equal({ bar: 'baz' });
		});
		it('transforms values', function () {
			expect(
				transformData(
					{
						foo: 'bar',
					},
					{
						from: 'foo',
						to: 'baz',
						transform: (str) => str + str,
					}
				)
			).to.deep.equal({ baz: 'barbar' });
		});
		it('extracts multiple values', function () {
			expect(
				transformData(
					{
						firstName: 'Jane',
						lastName: 'Doe',
						details: {
							maidenName: 'Smith',
						},
					},
					{
						from: {
							paths: ['firstName', 'lastName', 'details.maidenName'],
						},
						to: 'allNames',
					}
				)
			).to.deep.equal({ allNames: ['Jane', 'Doe', 'Smith'] });
		});
	});
	context('multiple sources', function () {
		it('extracts and combines multiple values', function () {
			expect(
				transformData(
					{
						firstName: 'Jane',
						lastName: 'Doe',
						details: {
							maidenName: 'Smith',
						},
					},
					{
						from: {
							paths: ['firstName', 'lastName', 'details.maidenName'],
							combine: (firstName, lastName, maidenName) =>
								`${firstName} ${lastName} nee ${maidenName}`,
						},
						to: 'fullName',
					}
				)
			).to.deep.equal({ fullName: 'Jane Doe nee Smith' });
		});
		it('and uses the default value if one of them is not set', function () {
			expect(
				transformData(
					{
						firstName: 'Jane',
						lastName: 'Doe',
						details: {
							maidenName: 'Smith',
						},
					},
					{
						from: {
							paths: ['firstName', 'lastName', 'details.maidenNames'],
							combine: (firstName, lastName, maidenName) =>
								`${firstName} ${lastName} nee ${maidenName}`,
						},
						to: 'fullName',
						default: 'I do not know her name',
					}
				)
			).to.deep.equal({ fullName: 'I do not know her name' });
		});
		it('and transforms them', function () {
			expect(
				transformData(
					{
						firstName: 'Jane',
						lastName: 'Doe',
						details: {
							maidenName: 'Smith',
						},
					},
					{
						from: {
							paths: ['firstName', 'lastName', 'details.maidenName'],
							combine: (firstName, lastName, maidenName) =>
								`${firstName} ${lastName} nee ${maidenName}`,
						},
						to: 'fullName',
						transform: (fullName) => `Her name was ${fullName}`,
					}
				)
			).to.deep.equal({ fullName: 'Her name was Jane Doe nee Smith' });
		});
		it('and applies nested instructions', function () {
			expect(
				transformData(
					{
						firstName: 'Jane',
						lastName: 'Doe',
						details: {
							maidenName: 'Smith',
						},
					},
					{
						from: {
							paths: ['firstName', 'lastName', 'details.maidenName'],
							combine: (firstName, lastName, maidenName) => ({
								firstName,
								lastName,
								maidenName,
							}),
						},
						to: 'allNames',
						instructions: [
							{
								from: 'firstName',
								to: 'fname',
							},
							{
								from: 'lastName',
								to: 'lname',
							},
							{
								from: 'maidenName',
								to: 'mname',
							},
						],
					}
				)
			).to.deep.equal({
				allNames: { fname: 'Jane', lname: 'Doe', mname: 'Smith' },
			});
		});
		it('and applies nested instructions, and assigns to root object with to:null', function () {
			expect(
				transformData(
					{
						firstName: 'Jane',
						lastName: 'Doe',
						details: {
							maidenName: 'Smith',
						},
					},
					{
						from: {
							paths: ['firstName', 'lastName', 'details.maidenName'],
							combine: (firstName, lastName, maidenName) => ({
								firstName,
								lastName,
								maidenName,
							}),
						},
						to: null,
						instructions: [
							{
								from: 'firstName',
								to: 'fname',
							},
							{
								from: 'lastName',
								to: 'lname',
							},
							{
								from: 'maidenName',
								to: 'mname',
							},
						],
					}
				)
			).to.deep.equal({ fname: 'Jane', lname: 'Doe', mname: 'Smith' });
		});
		it('and applies nested instructions, and transforms them', function () {
			expect(
				transformData(
					{
						firstName: 'Jane',
						lastName: 'Doe',
						details: {
							maidenName: 'Smith',
						},
					},
					{
						from: {
							paths: ['firstName', 'lastName', 'details.maidenName'],
							combine: (firstName, lastName, maidenName) => ({
								firstName,
								lastName,
								maidenName,
							}),
						},
						to: 'fullName',
						instructions: [
							{
								from: 'firstName',
								to: 'fname',
							},
							{
								from: 'lastName',
								to: 'lname',
							},
							{
								from: 'maidenName',
								to: 'mname',
							},
						],
						transform: ({ fname, lname, mname }) =>
							`Her name was ${fname} ${lname} nee ${mname}`,
					}
				)
			).to.deep.equal({ fullName: 'Her name was Jane Doe nee Smith' });
		});
	});
	context('error handling', function () {
		it('throws error if a path contains illegal values', function () {
			expect(function () {
				transformData({}, { from: [null], to: 'prop' });
			}).to.throw(DataTransformError, 'In "from"');
			expect(function () {
				transformData({}, { from: 'prop', to: [null] });
			}).to.throw(DataTransformError, 'In "to"');
			expect(function () {
				transformData({}, { from: { paths: [[null]] }, to: 'prop' });
			}).to.throw(DataTransformError, 'In "from"');
		});
		it('throws an error on a to:null assignment if the result value is not an object', function() {
			expect(function () {
				transformData({}, { from: 'prop', to: null });
			}).to.throw(DataTransformError, 'Cannot assign properties from a non-object');
		})
		it('throws an error if the transform property is not a function', function() {
			expect(function () {
				transformData({}, { from: 'prop', to: 'newProp', transform: 'not a function' });
			}).to.throw(DataTransformError, 'Transform is not a function');
		})
		it('throws an error if an instruction does not contain a from or to path', function() {
			expect(function () {
				transformData({}, { from: 'prop' });
			}).to.throw(DataTransformError, 'Must supply "to" key path');
			expect(function () {
				transformData({}, { to: 'prop' });
			}).to.throw(DataTransformError, 'Must supply "from" key path');
		})
		it('throws an error if source is not an object or array', function() {
			expect(function () {
				transformData('', {});
			}).to.throw(DataTransformError, 'Source must be an object or an array');
		})
	});
});

describe('transformDataFactory', function() {
	it('returns a new function that performs the transformation', function() {
		const sourceObject = {
			firstName: 'John',
			lastName: 'Doe',
			address: {
				streetName: 'Tanglewood Drive',
				country: {
					code: 'CA',
				},
			},
		};
		const instructions = [
			{
				from: 'firstName',
				to: 'name',
			},
			{
				from: 'lastName',
				to: 'surname',
			},
			{
				from: 'address.streetName',
				to: 'street',
			},
			{
				from: 'address.country.code',
				to: 'countryCode',
			},
		];
		const expectedResultObject = {
			name: 'John',
			surname: 'Doe',
			street: 'Tanglewood Drive',
			countryCode: 'CA',
		};
		const factoriedTransform = transformDataFactory(instructions);

		const resultFromDirectCall = transformData(sourceObject, instructions);
		const resultFromFactoried = factoriedTransform(sourceObject);
		expect(resultFromDirectCall).to.deep.equal(expectedResultObject);
		expect(resultFromFactoried).to.deep.equal(expectedResultObject);
		expect(resultFromFactoried).to.deep.equal(resultFromDirectCall);
	})
})