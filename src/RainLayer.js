import vertSrc from './shaders/simple.vert?glslify';
import fragSrc from './shaders/water.frag?glslify';

function createShader(gl, type, src){
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
    const err = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Shader compile error: '+err);
  }
  return shader;
}

function createProgram(gl, vs, fs){
  const v = createShader(gl, gl.VERTEX_SHADER, vs);
  const f = createShader(gl, gl.FRAGMENT_SHADER, fs);
  const prog = gl.createProgram();
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.bindAttribLocation(prog, 0, 'a_position');
  gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){
    const err = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error('Program link error: '+err);
  }
  return prog;
}

export default class RainLayer{
  constructor(canvas, {vertex=vertSrc, fragment=fragSrc, textures={}, options={}}={}){
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl');
    this.vertexSrc = vertex;
    this.fragmentSrc = fragment;
    this.program = createProgram(this.gl, this.vertexSrc, this.fragmentSrc);
    this._initBuffers();
    this.textures = {};
    this._setupDefaultUniforms();
    Object.keys(textures).forEach((k,i)=>{
      this.bindTexture(k, textures[k]);
    });
    this.running = false;
  }
  _initBuffers(){
    const gl = this.gl;
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    const vertices = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    this.vbo = vbo;
  }
  _setupDefaultUniforms(){
    const gl = this.gl;
    gl.useProgram(this.program);
    this.uniforms = {};
    const getU = (name) => gl.getUniformLocation(this.program, name);
    this.uniforms.u_resolution = getU('u_resolution');
    this.uniforms.u_parallax = getU('u_parallax');
    this.uniforms.u_brightness = getU('u_brightness');
    this.uniforms.u_textureFg = getU('u_textureFg');
    this.uniforms.u_textureBg = getU('u_textureBg');
    this.uniforms.u_waterMap = getU('u_waterMap');
  }
  setSize(w,h){
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = w/ (window.devicePixelRatio||1) + 'px';
    this.canvas.style.height = h/ (window.devicePixelRatio||1) + 'px';
  }
  setParallax(x,y){
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.u_parallax, x, y);
  }
  setUniform(name, value){
    const gl = this.gl;
    const u = this.uniforms[name];
    if(!u) return;
    gl.useProgram(this.program);
    if(typeof value === 'number') gl.uniform1f(u, value);
    else if(value.length === 2) gl.uniform2f(u, value[0], value[1]);
  }
  bindTexture(uniformName, image){
    const gl = this.gl;
    // create or update texture object
    let tex = this.textures[uniformName];
    if(!tex){
      tex = gl.createTexture();
      this.textures[uniformName] = tex;
    }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    try{
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }catch(e){
      // image might be a canvas sized differently or not ready yet
    }
  }
  _bindTexturesForDraw(){
    const gl = this.gl;
    gl.useProgram(this.program);
    let i = 0;
    for(const name in this.textures){
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[name]);
      const loc = gl.getUniformLocation(this.program, name);
      if(loc) gl.uniform1i(loc, i);
      i++;
    }
  }
  render(){
    const gl = this.gl;
    gl.viewport(0,0,this.canvas.width,this.canvas.height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    if(this.uniforms.u_resolution) gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    this._bindTexturesForDraw();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  setVisible(v){
    this.canvas.style.display = v? 'block' : 'none';
  }
  destroy(){
    const gl = this.gl;
    gl.deleteProgram(this.program);
  }
}