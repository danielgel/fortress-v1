class_name Codec
## Run-length + base64 codec for world layers. Port of src/core/codec.ts; the encoded
## strings are identical, so saves can move between the TS and Godot versions.


static func rle_encode(data: PackedByteArray) -> String:
	var out := PackedByteArray()
	var n := data.size()
	var i := 0
	while i < n:
		var v := data[i]
		var run := 1
		while i + run < n and data[i + run] == v and run < 255:
			run += 1
		out.append(run)
		out.append(v)
		i += run
	return Marshalls.raw_to_base64(out)


static func rle_decode(text: String, length: int) -> PackedByteArray:
	var bytes := Marshalls.base64_to_raw(text)
	var out := PackedByteArray()
	out.resize(length)
	var p := 0
	for i in range(0, bytes.size(), 2):
		var run := bytes[i]
		var v := bytes[i + 1]
		for k in run:
			out[p + k] = v
		p += run
	return out
