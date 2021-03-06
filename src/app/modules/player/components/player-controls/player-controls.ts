import {PlayQueueItem} from '../../models/play-queue-item';
import {Component, ElementRef, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {HumanReadableSecondsPipe} from '../../../shared/pipes/h-readable-seconds.pipe';
import {UserAnalyticsService} from '../../../user-analytics/services/user-analytics.service';
import {PlayQueueItemStatus} from '../../src/playqueue-item-status.enum';
import {PlayQueue} from '../../collections/play-queue';
import {FullScreenEventType, FullScreenService} from '../../../shared/services/fullscreen.service';
import {ITrack} from '../../../api/tracks/track.interface';
import {AbstractImageModel} from '../../../api/image/abstract-image';
import {filter} from 'rxjs/internal/operators';

declare let MediaMetadata: any;

@Component({
  selector: 'app-player-controls',
  styleUrls: ['./player-controls.scss'],
  templateUrl: './player-controls.html'
})
export class PlayerControlsComponent implements OnInit {
  private _docTitle: string;
  public currentItem: PlayQueueItem = new PlayQueueItem();

  @Input()
  public isBuffering: boolean;

  @Input()
  public playQueue: PlayQueue<PlayQueueItem>;

  @Input()
  public volume = 100;

  @Output()
  public volumeChange: EventEmitter<number>;

  constructor(private humanReadableSecPipe: HumanReadableSecondsPipe,
              private userAnalyticsService: UserAnalyticsService,
              private el: ElementRef,
              public fullScreenService: FullScreenService) {
    this.volumeChange = new EventEmitter<number>();
  }

  private setMobileMediaNotification(track: ITrack) {
    if ('mediaSession' in navigator) {
      const nv: any = navigator;
      const artwork: AbstractImageModel = track.image;
      const fallbackImg = '/assets/meta/icons/ios/apple-icon-180x180.png';
      nv.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist.getFullName(),
        artwork: [
          {src: artwork.getSmallSizeUrl() || fallbackImg, sizes: '96x96', type: 'image/jpg'},
          {src: artwork.getSmallSizeUrl() || fallbackImg, sizes: '128x128', type: 'image/jpg'},
          {src: artwork.getMediumSizeUrl() || fallbackImg, sizes: '192x192', type: 'image/jpg'},
          {src: artwork.getMediumSizeUrl() || fallbackImg, sizes: '256x256', type: 'image/jpg'},
          {src: artwork.getLargeSizeUrl() || fallbackImg, sizes: '384x384', type: 'image/jpg'},
          {src: artwork.getLargeSizeUrl() || fallbackImg, sizes: '512x512', type: 'image/jpg'}
        ]
      });
      if (this.playQueue.hasPreviousItem()) {
        nv.mediaSession.setActionHandler('previoustrack', () => {
          this.userAnalyticsService.trackEvent('chrome_mob', 'previous_track', 'app-player-controls-cmp');
          this.previous();
        });
      }
      if (this.playQueue.hasNextItem()) {
        nv.mediaSession.setActionHandler('nexttrack', () => {
          this.userAnalyticsService.trackEvent('chrome_mob', 'next_track', 'app-player-controls-cmp');
          this.next();
        });
      }
    }
  }

  private setBrowserTitle(playingTrack?: ITrack) {
    if (playingTrack) {
      document.title = playingTrack.title;
    } else {
      document.title = this._docTitle;
    }
  }

  private enteredFullScreen() {
    this.userAnalyticsService.trackEvent('player_ctrls', 'entered_fullscreen', 'app-player-controls-cmp');
    this.el.nativeElement.classList.add('full-screen');
  }

  private leftFullScreen() {
    this.el.nativeElement.classList.remove('full-screen');
  }

  public play(): void {
    const currItem = this.playQueue.getCurrentItem();
    if (currItem) {
      currItem.play(currItem.progress);
      this.userAnalyticsService.trackEvent('player_ctrls', 'play', 'app-player-controls-cmp');
    }
  }

  public pause(): void {
    const currItem = this.playQueue.getPlayingItem();
    if (currItem) {
      currItem.pause();
      this.userAnalyticsService.trackEvent('player_ctrls', 'pause', 'app-player-controls-cmp');
    }
  }

  public togglePlayPause(): void {
    const currItem = this.playQueue.getCurrentItem();
    if (currItem) {
      if (currItem.isPlaying()) {
        this.pause();
      } else {
        this.play();
      }
    }
  }

  public previous(): void {
    const playingItem = this.playQueue.getPlayingItem();
    if (playingItem && playingItem.progress > 3) {
      playingItem.restart();
      this.userAnalyticsService.trackEvent('player_ctrls', 'restart_track', 'app-player-controls-cmp');
    } else if (this.playQueue.hasPreviousItem()) {
      this.playQueue.getPreviousItem().play();
      this.userAnalyticsService.trackEvent('player_ctrls', 'previous_track', 'app-player-controls-cmp');
    }
  }

  public next(): void {
    if (this.playQueue.hasNextItem()) {
      this.playQueue.getNextItem().play();
      this.userAnalyticsService.trackEvent('player_ctrls', 'next_track', 'app-player-controls-cmp');
    }
  }

  public transformProgressBarValues = (input: string) => {
    return this.humanReadableSecPipe.transform(input, null);
  };

  public playTrackFromPosition(from: number) {
    const currItem = this.playQueue.getCurrentItem();
    if (currItem) {
      currItem.seekTo(from);
    }
  }

  public toggleFullScreen() {
    if (!this.fullScreenService.isInFullScreen()) {
      this.fullScreenService.enter();
    } else {
      this.fullScreenService.leave();
    }
  }

  public toggleShuffle() {
    if (this.playQueue.isShuffled()) {
      this.playQueue.deShuffle();
      this.userAnalyticsService.trackEvent('player_ctrls', 'deshuffle', 'app-player-controls-cmp');
    } else {
      this.playQueue.shuffle();
      this.userAnalyticsService.trackEvent('player_ctrls', 'shuffle', 'app-player-controls-cmp');
    }
  }

  public toggleLoop() {
    if (this.playQueue.isLooped()) {
      this.playQueue.setLoopPlayQueue(false);
      this.userAnalyticsService.trackEvent('player_ctrls', 'disable_loop', 'app-player-controls-cmp');
    } else {
      this.playQueue.setLoopPlayQueue(true);
      this.userAnalyticsService.trackEvent('player_ctrls', 'enable_loop', 'app-player-controls-cmp');
    }
  }

  public setVolume(volume: number) {
    this.volumeChange.emit(volume);
  }

  ngOnInit(): void {
    this._docTitle = document.title;
    this.playQueue.on('change:status', (model: PlayQueueItem, status: PlayQueueItemStatus) => {
      if (status === PlayQueueItemStatus.RequestedPlaying) {
        this.currentItem = this.playQueue.getCurrentItem();
        this.setMobileMediaNotification(this.currentItem.track);
        this.setBrowserTitle(this.currentItem.track);
      }
      if (status === PlayQueueItemStatus.RequestedPause) {
        this.currentItem = this.playQueue.getCurrentItem();
        this.setMobileMediaNotification(this.currentItem.track);
        this.setBrowserTitle();
      }
    });

    this.playQueue.on('add', () => {
      const currentItem = this.playQueue.getCurrentItem();
      if (currentItem) {
        this.currentItem = this.playQueue.getCurrentItem();
      }
    });

    this.fullScreenService.getObservable()
      .pipe(
        filter(eventType => eventType === FullScreenEventType.Enter)
      )
      .subscribe(this.enteredFullScreen.bind(this));

    this.fullScreenService.getObservable()
      .pipe(
        filter(eventType => eventType === FullScreenEventType.Leave)
      )
      .subscribe(this.leftFullScreen.bind(this));
  }

}
