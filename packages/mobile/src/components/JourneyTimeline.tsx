import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JourneyStep {
  stage: string;
  date: string;
  location: string;
  verified: boolean;
}

interface JourneyTimelineProps {
  steps: JourneyStep[];
  /** Index of the current (latest) stage. Defaults to last verified step. */
  currentIndex?: number;
}

// ---------------------------------------------------------------------------
// Stage icon map
// ---------------------------------------------------------------------------

const STAGE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  manufactured: 'construct',
  distributed: 'car',
  wholesaler: 'storefront',
  retail: 'cart',
  you: 'person',
};

function getStageIcon(stage: string): keyof typeof Ionicons.glyphMap {
  const key = stage.toLowerCase().replace(/\s/g, '');
  return STAGE_ICONS[key] ?? 'ellipse';
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const JourneyTimeline: React.FC<JourneyTimelineProps> = ({
  steps,
  currentIndex,
}) => {
  const { t } = useTranslation();

  // Determine the current stage index.
  const activeIdx =
    currentIndex ??
    (() => {
      for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].verified) return i;
      }
      return 0;
    })();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('verification.supplyChain')}</Text>

      {steps.map((step, idx) => {
        const isCurrent = idx === activeIdx;
        const isCompleted = idx <= activeIdx;

        return (
          <View key={idx} style={styles.stepRow}>
            {/* Vertical line + dot */}
            <View style={styles.lineColumn}>
              {/* Top line segment */}
              {idx > 0 && (
                <View
                  style={[
                    styles.lineSegment,
                    isCompleted ? styles.lineActive : styles.lineInactive,
                  ]}
                />
              )}

              {/* Circle / dot */}
              <View
                style={[
                  styles.dot,
                  isCurrent
                    ? styles.dotCurrent
                    : isCompleted
                    ? styles.dotCompleted
                    : styles.dotPending,
                ]}
              >
                <Ionicons
                  name={
                    isCompleted
                      ? step.verified
                        ? 'checkmark'
                        : getStageIcon(step.stage)
                      : getStageIcon(step.stage)
                  }
                  size={18}
                  color={isCompleted ? '#fff' : '#94a3b8'}
                />
              </View>

              {/* Bottom line segment */}
              {idx < steps.length - 1 && (
                <View
                  style={[
                    styles.lineSegment,
                    idx < activeIdx ? styles.lineActive : styles.lineInactive,
                  ]}
                />
              )}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text
                style={[
                  styles.stageName,
                  isCurrent && styles.stageNameCurrent,
                ]}
              >
                {step.stage}
              </Text>
              <Text style={styles.date}>{formatDate(step.date)}</Text>
              {step.location ? (
                <Text style={styles.location}>{step.location}</Text>
              ) : null}
              {step.verified && (
                <View style={styles.verifiedRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#16a34a"
                  />
                  <Text style={styles.verifiedLabel}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 72,
  },
  lineColumn: {
    alignItems: 'center',
    width: 40,
  },
  lineSegment: {
    flex: 1,
    width: 3,
  },
  lineActive: {
    backgroundColor: '#16a34a',
  },
  lineInactive: {
    backgroundColor: '#e2e8f0',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCurrent: {
    backgroundColor: '#16a34a',
    borderWidth: 3,
    borderColor: '#bbf7d0',
  },
  dotCompleted: {
    backgroundColor: '#16a34a',
  },
  dotPending: {
    backgroundColor: '#e2e8f0',
  },
  content: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  stageName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#334155',
  },
  stageNameCurrent: {
    color: '#16a34a',
    fontWeight: '700',
  },
  date: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  location: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  verifiedLabel: {
    fontSize: 14,
    color: '#16a34a',
    marginLeft: 4,
    fontWeight: '600',
  },
});

export default JourneyTimeline;
