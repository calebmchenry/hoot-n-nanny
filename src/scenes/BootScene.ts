import Phaser from 'phaser';
import { SceneKey } from '../types';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  create(): void {
    this.scene.start(SceneKey.Barn);
  }
}
