/// <reference path="./mixcloud.d.ts" />
import {Component, ElementRef, Input, OnDestroy, OnInit} from '@angular/core';
import {uniqueId} from 'underscore';
import {IPlayer, IPlayerOptions, IPlayerSize} from '../../src/player.interface';
import {AbstractPlayer} from '../../src/abstract-player.class';
import {TrackMixcloudModel} from '../../../api/tracks/track-mixcloud.model';
import {ImageSizes} from '../../../shared/src/image-sizes.enum';
import {ProviderMap} from '../../../shared/src/provider-map.class';

@Component({
  selector: 'app-mixcloud-player',
  styleUrls: ['./mixcloud-player.scss'],
  templateUrl: './mixcloud-player.html'
})
export class MixcloudPlayerComponent extends AbstractPlayer implements IPlayer, OnInit, OnDestroy {
  private _mcPlayer: Mixcloud.IPlayerWidget;
  private _mcApiReady = false;
  private _seekedTo: number;

  @Input()
  public track: TrackMixcloudModel;

  public providerMap: ProviderMap = ProviderMap.map;

  constructor(private el: ElementRef) {
    super();
    if ((<any>window).Mixcloud) {
      this._mcApiReady = true;
    }
  }

  public id = uniqueId('mc_player');

  private handleMcStatusChange(ev: string, arg: any) {
    switch (ev) {
      case 'buffering':
        this._mcPlayer.getDuration().then(this.setDuration.bind(this));
        this.onWaiting();
        break;
      case 'play':
        this._mcPlayer.getDuration().then(this.setDuration.bind(this));
        this.onPlaying();
        break;
      case 'pause':
        this.onPaused();
        break;
      case 'ended':
        this.onEnded();
        break;
      case 'progress':
        this.onCurrentTimeUpdate(arg);
        break;
      case 'error':
        this.onError(arg);
        break;
    }
  }

  protected bindListeners() {
    this.unBindListeners();
    this._mcPlayer.events.pause.on(this.handleMcStatusChange.bind(this, 'pause'));
    this._mcPlayer.events.play.on(this.handleMcStatusChange.bind(this, 'play'));
    this._mcPlayer.events.buffering.on(this.handleMcStatusChange.bind(this, 'buffering'));
    this._mcPlayer.events.progress.on(this.handleMcStatusChange.bind(this, 'progress'));
    this._mcPlayer.events.ended.on(this.handleMcStatusChange.bind(this, 'ended'));
    this._mcPlayer.events.error.on(this.handleMcStatusChange.bind(this, 'error'));
  }

  protected unBindListeners() {
    this._mcPlayer.events.pause.off(this.handleMcStatusChange.bind(this, 'pause'));
    this._mcPlayer.events.play.off(this.handleMcStatusChange.bind(this, 'play'));
    this._mcPlayer.events.buffering.off(this.handleMcStatusChange.bind(this, 'buffering'));
    this._mcPlayer.events.progress.off(this.handleMcStatusChange.bind(this, 'progress'));
    this._mcPlayer.events.ended.off(this.handleMcStatusChange.bind(this, 'ended'));
    this._mcPlayer.events.error.off(this.handleMcStatusChange.bind(this, 'error'));
  }

  protected initialisePlayerSDK(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const mixcloudElId = 'mixcloudJsSdk';
      const youtubeScriptEl = document.getElementById(mixcloudElId);
      if (this._mcApiReady) {
        resolve(true);
      } else {
        let js: HTMLScriptElement;
        const scripts = document.getElementsByTagName('script')[0];
        js = document.createElement('script');
        js.id = mixcloudElId;
        js.src = '//widget.mixcloud.com/media/js/widgetApi.js';
        scripts.parentNode.insertBefore(js, youtubeScriptEl);
        js.onload = (() => {
          this._mcApiReady = true;
          resolve(true);
        });
      }
    });
  }

  protected initialisePlayer(options: IPlayerOptions): Promise<Mixcloud.IPlayerWidget> {
    return new Promise((resolve) => {
      if (!document.getElementById(this.id)) {
        throw new Error('Mixcloud player element is not attached to the dom!');
      }
      const widget = Mixcloud.PlayerWidget(document.getElementById(this.id));
      widget.ready.then(() => {
        this._mcPlayer = widget;
        resolve(this._mcPlayer);
      });
    });
  }

  protected deInitialisePlayer(): void {
  }

  protected setPlayerVolume(volume: number) {
  }

  protected setPlayerSize(size: IPlayerSize) {
  }

  protected preloadTrack(track: TrackMixcloudModel, startTime: number = 0) {
    this._mcPlayer.load(this.track.id, true);
  }

  protected startPlayer(): void {
    this.onRequestPlay();
    this._mcPlayer.play().then(() => {
      if (this._seekedTo) {
        this.seekPlayerTo(this._seekedTo);
        this._seekedTo = null;
      }
    });
  }

  protected pausePlayer(): void {
    this._mcPlayer.pause();
  }

  protected stopPlayer(): void {
    this._mcPlayer.pause();
  }

  protected seekPlayerTo(to: number) {
    this._seekedTo = to;
    return this._mcPlayer.seek(to);
  }

  public getPlayerEl(): ElementRef {
    return this.el;
  }

  public getCoverSize(): ImageSizes {
    return ImageSizes.Large;
  }

  ngOnDestroy(): void {
    delete this._mcPlayer;
  }
}
