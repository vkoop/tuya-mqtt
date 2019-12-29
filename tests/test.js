const test = require('ava');

const {isJsonString} = require('../util-functions');

test('test if is json string', t => {
	t.truthy(isJsonString('{}'));
	t.truthy(isJsonString('{"a": 1, "b": "a", "c": "d"}'));
	t.truthy(isJsonString('1'));
	t.truthy(isJsonString('[]'));
	t.falsy(isJsonString(1));
	t.falsy(isJsonString({}));
});
