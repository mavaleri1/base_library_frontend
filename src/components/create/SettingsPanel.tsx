import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Checkbox, Card, CardHeader, CardTitle, CardContent } from '../ui';
import { PROFILE_SETTINGS_VISIBLE_BY_DEFAULT, ROUTES } from '../../utils/constants';
import type { MaterialSettings, Placeholder, UserPlaceholderSettings } from '../../types';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';

interface SettingsPanelProps {
  settings: MaterialSettings;
  onChange: (settings: MaterialSettings) => void;
  placeholders?: Placeholder[];
  userPlaceholderSettings?: UserPlaceholderSettings | null;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onChange,
  placeholders = [],
  userPlaceholderSettings = null,
}) => {
  const handleChange = <K extends keyof MaterialSettings>(
    key: K,
    value: MaterialSettings[K]
  ) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const [showMoreSettings, setShowMoreSettings] = useState(false);

  const hasProfileData =
    userPlaceholderSettings?.placeholders &&
    Object.keys(userPlaceholderSettings.placeholders).length > 0 &&
    placeholders.length > 0;

  const visibleDisplayNames = new Set(
    PROFILE_SETTINGS_VISIBLE_BY_DEFAULT.map((s) => s)
  );
  const primaryPlaceholders = placeholders.filter((p) =>
    visibleDisplayNames.has(p.display_name as typeof PROFILE_SETTINGS_VISIBLE_BY_DEFAULT[number])
  );
  const restPlaceholders = placeholders.filter(
    (p) => !visibleDisplayNames.has(p.display_name as typeof PROFILE_SETTINGS_VISIBLE_BY_DEFAULT[number])
  );

  const renderSettingLine = (placeholder: Placeholder) => {
    const userSetting = userPlaceholderSettings!.placeholders[placeholder.name];
    const valueDisplay = userSetting?.display_name ?? '—';
    return (
      <li key={placeholder.id}>
        <span className="text-ink">{placeholder.display_name}:</span> {valueDisplay}
      </li>
    );
  };

  return (
    <Card variant="bordered">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="text-primary" size={20} />
          <CardTitle>Profile Settings</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasProfileData ? (
          <p className="text-sm text-muted">
            Configure in{' '}
            <Link to={ROUTES.PROFILE} className="text-primary underline hover:no-underline">
              Profile
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-1.5 text-sm text-muted">
              {primaryPlaceholders.map(renderSettingLine)}
            </ul>
            {restPlaceholders.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowMoreSettings((v) => !v)}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  {showMoreSettings ? (
                    <>
                      <ChevronUp size={16} />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      Show more ({restPlaceholders.length})
                    </>
                  )}
                </button>
                {showMoreSettings && (
                  <ul className="space-y-1.5 text-sm text-muted pl-1 border-l-2 border-border">
                    {restPlaceholders.map(renderSettingLine)}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        <div className="border-t border-border pt-4 space-y-3">
          <h4 className="text-sm font-medium text-ink">Additional Options</h4>

          <Checkbox
            label="Refinement Mode (HITL)"
            description="Ability to edit and refine materials during the process"
            checked={settings.enableHITL}
            onChange={(e) => handleChange('enableHITL', e.target.checked)}
          />

          <Checkbox
            label="Interactive editing"
            description="Targeted edits to synthesized material"
            checked={settings.enableEditing}
            onChange={(e) => handleChange('enableEditing', e.target.checked)}
          />

          <Checkbox
            label="Generate additional questions"
            description="Gap analysis and creating questions to test knowledge"
            checked={settings.enableGapQuestions}
            onChange={(e) => handleChange('enableGapQuestions', e.target.checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
