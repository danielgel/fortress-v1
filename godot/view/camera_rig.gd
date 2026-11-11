class_name CameraRig
extends Camera2D
## Pan with arrows/WASD (Shift: faster) or by dragging with the right or middle mouse button;
## zoom with Ctrl+wheel or +/-, around the mouse pointer.

const PAN_SPEED := 900.0
const ZOOM_MIN := 0.25
const ZOOM_MAX := 4.0

var _dragging := false


func _process(delta: float) -> void:
	var dir := Vector2.ZERO
	if Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_A):
		dir.x -= 1
	if Input.is_key_pressed(KEY_RIGHT) or Input.is_key_pressed(KEY_D):
		dir.x += 1
	if Input.is_key_pressed(KEY_UP) or Input.is_key_pressed(KEY_W):
		dir.y -= 1
	if Input.is_key_pressed(KEY_DOWN) or Input.is_key_pressed(KEY_S):
		dir.y += 1
	if dir != Vector2.ZERO:
		var fast := 3.0 if Input.is_key_pressed(KEY_SHIFT) else 1.0
		position += dir.normalized() * PAN_SPEED * fast * delta / zoom.x


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_RIGHT or mb.button_index == MOUSE_BUTTON_MIDDLE:
			_dragging = mb.pressed
		elif mb.pressed and mb.ctrl_pressed and mb.button_index == MOUSE_BUTTON_WHEEL_UP:
			zoom_by(1.15)
			get_viewport().set_input_as_handled()
		elif mb.pressed and mb.ctrl_pressed and mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			zoom_by(1 / 1.15)
			get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and _dragging:
		position -= (event as InputEventMouseMotion).relative / zoom.x
	elif event is InputEventKey and event.pressed:
		match (event as InputEventKey).keycode:
			KEY_EQUAL, KEY_KP_ADD:
				zoom_by(1.25)
			KEY_MINUS, KEY_KP_SUBTRACT:
				zoom_by(1 / 1.25)


## Zoom keeping the world point under the mouse in place.
func zoom_by(factor: float) -> void:
	var before := get_global_mouse_position()
	var z := clampf(zoom.x * factor, ZOOM_MIN, ZOOM_MAX)
	zoom = Vector2(z, z)
	position += before - get_global_mouse_position()
