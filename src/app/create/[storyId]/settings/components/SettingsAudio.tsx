'use client';

import { WorldSettings } from '@/engine/models';
import { SamplePicker } from '@/components/admin/AudioTrackPicker';
import SmartArea from '@/components/admin/SmartArea';

interface SettingsAudioProps {
    settings: WorldSettings;
    onChange: (field: string, value: any) => void;
    storyId: string;
}

export default function SettingsAudio({ settings, onChange, storyId }: SettingsAudioProps) {
    return (
        <>
            <div className="form-group">
                <label className="form-label">Default Music Track</label>
                <SmartArea
                    storyId={storyId}
                    value={settings.defaultMusicTrackId || ''}
                    onChange={v => onChange('defaultMusicTrackId', v || undefined)}
                    entityType="music"
                    placeholder="None — global fallback music"
                    minHeight="38px"
                />
                <p className="special-desc">
                    Plays when no location, region, or storylet overrides the music. Supports playlists (comma-separated IDs) and ScribeScript conditionals.
                </p>
            </div>

            <div className="form-group">
                <label className="form-label">Music Fade Duration (ms)</label>
                <input
                    type="number"
                    min={0}
                    step={100}
                    value={settings.musicFadeDuration ?? ''}
                    onChange={e => onChange('musicFadeDuration', e.target.value ? Number(e.target.value) : undefined)}
                    className="form-input"
                    placeholder="e.g. 2000 (leave blank for instant)"
                    style={{ maxWidth: '220px' }}
                />
                <p className="special-desc">How long (in milliseconds) to cross-fade between music tracks.</p>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--tool-border)', margin: '1.2rem 0' }} />

            <p style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)', marginBottom: '0.8rem' }}>
                These sounds play automatically when options are clicked or resolved — unless the individual option has its own sound configured.
            </p>

            <div className="form-group">
                <label className="form-label">Default Click Sound</label>
                <SamplePicker
                    value={settings.defaultClickSoundUrl}
                    onChange={v => onChange('defaultClickSoundUrl', v)}
                    placeholder="None — played when any option is clicked"
                />
                <p className="special-desc">Plays immediately when the player clicks an option (before the outcome is resolved).</p>
            </div>

            <div className="form-group">
                <label className="form-label">Default Sound</label>
                <SamplePicker
                    value={settings.defaultSoundUrl}
                    onChange={v => onChange('defaultSoundUrl', v)}
                    placeholder="None — played for guaranteed (no-challenge) options"
                />
                <p className="special-desc">Plays when an option resolves with no skill check required (guaranteed pass).</p>
            </div>

            <div className="form-group">
                <label className="form-label">Default Success Sound</label>
                <SamplePicker
                    value={settings.defaultPassSoundUrl}
                    onChange={v => onChange('defaultPassSoundUrl', v)}
                    placeholder="None — played on a successful skill check"
                />
                <p className="special-desc">Plays after a skill check option resolves successfully.</p>
            </div>

            <div className="form-group">
                <label className="form-label">Default Failure Sound</label>
                <SamplePicker
                    value={settings.defaultFailSoundUrl}
                    onChange={v => onChange('defaultFailSoundUrl', v)}
                    placeholder="None — played on a failed outcome"
                />
                <p className="special-desc">Plays after an option resolves as a failure.</p>
            </div>
        </>
    );
}
