import { Renderer, Camera, Transform, Plane } from 'https://cdn.jsdelivr.net/npm/ogl@1.0.3/src/index.js'
import NormalizeWheel from 'normalize-wheel'

import { lerp } from 'utils/math'

import Media from './demo-1/Media'

export default class App {
  constructor () {
    this.scroll = {
      ease: 0.05,
      current: 0,
      target: 0,
      last: 0
    }

    this.speed = 2

    this.createRenderer()
    this.createCamera()
    this.createScene()
    this.createGallery()

    this.onResize()

    this.createGeometry()
    this.createMedias()

    this.update()

    this.addEventListeners()
  }

  createGallery () {
    this.gallery = document.querySelector('.demo-1__gallery')
  }

  createRenderer () {
    this.renderer = new Renderer({
      alpha: true
    })

    this.gl = this.renderer.gl

    document.body.appendChild(this.gl.canvas)
  }

  createCamera () {
    this.camera = new Camera(this.gl)
    this.camera.fov = 45
    this.camera.position.z = 5
  }

  createScene () {
    this.scene = new Transform()
  }

  createGeometry () {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 10
    })
  }

  createMedias () {
    this.mediasElements = document.querySelectorAll('.demo-1__gallery__figure')
    this.medias = Array.from(this.mediasElements).map(element => {
      let media = new Media({
        element,
        geometry: this.planeGeometry,
        gl: this.gl,
        height: this.galleryHeight,
        scene: this.scene,
        screen: this.screen,
        viewport: this.viewport
      })

      return media
    })
  }

  /**
   * Events.
   */
  onTouchDown (event) {
    this.isDown = true

    this.scroll.position = this.scroll.current
    this.start = event.touches ? event.touches[0].clientY : event.clientY
  }

  onTouchMove (event) {
    if (!this.isDown) return

    const y = event.touches ? event.touches[0].clientY : event.clientY
    const distance = (this.start - y) * 2

    this.scroll.target = this.scroll.position + distance
  }

  onTouchUp (event) {
    this.isDown = false
  }

  onWheel (event) {
    const normalized = NormalizeWheel(event)
    const speed = normalized.pixelY

    this.scroll.target += speed * 0.5
  }

  /**
   * Resize.
   */
  onResize () {
    this.screen = {
      height: window.innerHeight,
      width: window.innerWidth
    }

    this.renderer.setSize(this.screen.width, this.screen.height)

    this.camera.perspective({
      aspect: this.gl.canvas.width / this.gl.canvas.height
    })

    const fov = this.camera.fov * (Math.PI / 180)
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z
    const width = height * this.camera.aspect

    this.viewport = {
      height,
      width
    }

    this.galleryBounds = this.gallery.getBoundingClientRect()
    this.galleryHeight = this.viewport.height * this.galleryBounds.height / this.screen.height

    if (this.medias) {
      this.medias.forEach(media => media.onResize({
        height: this.galleryHeight,
        screen: this.screen,
        viewport: this.viewport
      }))
    }
  }

  /**
   * Update.
   */
  update () {
    this.scroll.target += this.speed

    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease)

    if (this.scroll.current > this.scroll.last) {
      this.direction = 'down'
      this.speed = 2
    } else if (this.scroll.current < this.scroll.last) {
      this.direction = 'up'
      this.speed = -2
    }

    if (this.medias) {
      this.medias.forEach(media => media.update(this.scroll, this.direction))
    }

    this.renderer.render({
      scene: this.scene,
      camera: this.camera
    })

    this.scroll.last = this.scroll.current

    window.requestAnimationFrame(this.update.bind(this))
  }

  /**
   * Listeners.
   */
  addEventListeners () {
    window.addEventListener('resize', this.onResize.bind(this))

    window.addEventListener('mousewheel', this.onWheel.bind(this))
    window.addEventListener('wheel', this.onWheel.bind(this))

    window.addEventListener('mousedown', this.onTouchDown.bind(this))
    window.addEventListener('mousemove', this.onTouchMove.bind(this))
    window.addEventListener('mouseup', this.onTouchUp.bind(this))

    window.addEventListener('touchstart', this.onTouchDown.bind(this))
    window.addEventListener('touchmove', this.onTouchMove.bind(this))
    window.addEventListener('touchend', this.onTouchUp.bind(this))
  }
}


import { Mesh, Program, Texture } from 'https://cdn.jsdelivr.net/npm/ogl@1.0.3/src/index.js'

import fragment from 'https://cdn.jsdelivr.net/gh/Adrienchester/variant@main/fragment.glsl'
import vertex from 'https://cdn.jsdelivr.net/gh/Adrienchester/variant@main/vertex.glsl'

export class grosseshit {
  constructor ({ element, geometry, gl, height, scene, screen, viewport }) {
    this.element = element
    this.image = this.element.querySelector('img')

    this.extra = 0
    this.height = height
    this.geometry = geometry
    this.gl = gl
    this.scene = scene
    this.screen = screen
    this.viewport = viewport

    this.createMesh()
    this.createBounds()

    this.onResize()
  }

  createMesh () {
    const image = new Image()
    const texture = new Texture(this.gl, {
      generateMipmaps: false
    })

    image.src = this.image.src
    image.onload = _ => {
      program.uniforms.uImageSizes.value = [image.naturalWidth, image.naturalHeight]
      texture.image = image
    }

    const program = new Program(this.gl, {
      fragment,
      vertex,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uViewportSizes: { value: [this.viewport.width, this.viewport.height] },
        uStrength: { value: 0 }
      },
      transparent: true
    })

    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program
    })

    this.plane.setParent(this.scene)
  }

  createBounds () {
    this.bounds = this.element.getBoundingClientRect()

    this.updateScale()
    this.updateX()
    this.updateY()

    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y]
  }

  updateScale () {
    this.plane.scale.x = this.viewport.width * this.bounds.width / this.screen.width
    this.plane.scale.y = this.viewport.height * this.bounds.height / this.screen.height
  }

  updateX (x = 0) {
    this.plane.position.x = -(this.viewport.width / 2) + (this.plane.scale.x / 2) + ((this.bounds.left - x) / this.screen.width) * this.viewport.width
  }

  updateY (y = 0) {
    this.plane.position.y = ((this.viewport.height / 2) - (this.plane.scale.y / 2) - ((this.bounds.top - y) / this.screen.height) * this.viewport.height) - this.extra
  }

  update (y, direction) {
    this.updateScale()
    this.updateX()
    this.updateY(y.current)

    const planeOffset = this.plane.scale.y / 2
    const viewportOffset = this.viewport.height / 2

    this.isBefore = this.plane.position.y + planeOffset < -viewportOffset
    this.isAfter = this.plane.position.y - planeOffset > viewportOffset

    if (direction === 'up' && this.isBefore) {
      this.extra -= this.height

      this.isBefore = false
      this.isAfter = false
    }

    if (direction === 'down' && this.isAfter) {
      this.extra += this.height

      this.isBefore = false
      this.isAfter = false
    }

    this.plane.program.uniforms.uStrength.value = ((y.current - y.last) / this.screen.width) * 10
  }

  /**
   * Events.
   */
  onResize (sizes) {
    this.extra = 0

    if (sizes) {
      const { height, screen, viewport } = sizes

      if (height) this.height = height
      if (screen) this.screen = screen
      if (viewport) {
        this.viewport = viewport

        this.plane.program.uniforms.uViewportSizes.value = [this.viewport.width, this.viewport.height]
      }
    }

    this.createBounds()
  }
}
