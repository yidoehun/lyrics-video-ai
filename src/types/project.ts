export type VideoStyle = "cinematic" | "minimal" | "neon";

export interface RecognizedTrack {
  title: string;
    artist: string;
      album?: string;
      }

      export interface VideoSettings {
        backgroundColor: string;
          textColor: string;
            fontSize: number;
            }

            export interface LyricsLine {
              text: string;
                startTime: number;
                  endTime: number;
                  }

                  export interface LyricsVideoProject {
                    id?: string;
                      title: string;
                        artist: string;
                          lyrics: string;
                            videoStyle: VideoStyle;
                              audioFileName?: string;
                                videoSettings?: VideoSettings;
                                  createdAt?: string;
                                    updatedAt?: string;
                                    }