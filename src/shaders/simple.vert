#version 300 es
// Fullscreen triangle-strip quad. WebGL1 compiles simple.es100.vert instead.
precision mediump float;
in vec2 a_position;
void main(){
  gl_Position = vec4(a_position, 0.0, 1.0);
}
