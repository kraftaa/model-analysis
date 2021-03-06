/**
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import {PolymerElement} from '@polymer/polymer/polymer-element.js';
import {template} from './fairness-nb-container-template.html.js';

import {SelectEventMixin} from '../../../../frontend/tfma-nb-event-mixin/tfma-nb-event-mixin.js';

import '@polymer/paper-card/paper-card.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '../fairness-metrics-board/fairness-metrics-board.js';
import '../fairness-metric-and-slice-selector/fairness-metric-and-slice-selector.js';

const Util = goog.require('tensorflow_model_analysis.addons.fairness.frontend.Util');

/**
 * @extends HTMLElement
 * @polymer
 */
export class FairnessNbContainer extends SelectEventMixin
(PolymerElement) {
  constructor() {
    super();
  }

  static get is() {
    return 'fairness-nb-container';
  }

  /** @return {!HTMLTemplateElement} */
  static get template() {
    return template;
  }


  /** @return {!PolymerElementProperties} */
  static get properties() {
    return {
      /**
       * The slicing metrics evaluation result. It's a list of dict with key
       * "slice" and "metrics". For example:
       * [
       *   {
       *     "slice": "Overall",
       *     "sliceValue": "Overall"
       *     "metrics": {
       *       "auc": {
       *         "doubleValue": 0.6
       *       }
       *     }
       *   }, {
       *     "slice":"feature:1",
       *     "sliceValue":"1",
       *     "metrics": {
       *       "auc": {
       *         "doubleValue": 0.6
       *       }
       *     }
       *   }
       * ]
       * @type {!Array<!Object>}
       */
      slicingMetrics: {type: Array, observer: 'slicingMetricsChanged_'},

      /**
       * The list of run numbers that's available to select.
       * @type {!Array<string>}
       */
      availableEvaluationRuns: {type: Array, value: []},

      /**
       * The full names of metrics available. eg: auc, negative_rate@0.25 or
       * post_export_metrics/head_1/negative_rate@0.25.
       * @private {!Array<string>|undefined}
       */
      availableMetricsNames_: {
        type: Array,
      },

      /**
       * The short names of metrics available. eg: auc, negative_rate or
       * post_export_metrics/head_1/negative_rate.
       * @private {!Array<string>}
       */
      selectableMetrics_: {type: Array},

      /** @private {!Array<string>} */
      selectedMetrics_: {
        type: Array,
      },

      /** @type {string} */
      weightColumn: {type: String, value: 'totalWeightedExamples'},

      /** @type {string} */
      selectedEvaluationRun: {type: String, notify: true},
    };
  }

  /**
   * @param {!Array<!Object>} slicingMetrics
   * @return {undefined}
   * @private
   */
  slicingMetricsChanged_(slicingMetrics) {
    if (slicingMetrics) {
      tfma.Data.flattenMetrics(slicingMetrics, 'metrics');
    }
    this.availableMetricsNames_ =
        this.computeAvailableMetricsNames_(slicingMetrics);
    this.updateSelectableMetrics_(this.availableMetricsNames_);
  }
  /**
   * @param {!Array<!Object>} slicingMetrics
   * @return {!Array<string>|undefined} An array of names of all metrics
   *     suitable for the fairness view.
   * @private
   */
  computeAvailableMetricsNames_(slicingMetrics) {
    if (!slicingMetrics) {
      return [];
    }
    const allMetrics = new Set();
    slicingMetrics.forEach(slicingMetric => {
      Object.keys(slicingMetric['metrics']).forEach(metricName => {
        allMetrics.add(metricName);
      });
    });
    // Only support fairness, numeric value, and bounded value metrics.
    const isSupportedMetricFormat = (metricName) => {
      if (Util.extractFairnessMetric(metricName)) {
        return true;
      }
      const metric_value = slicingMetrics[0]['metrics'][metricName];
      const is_defined = metric_value !== undefined;
      const is_number = typeof metric_value === 'number';
      return is_defined &&
          (is_number || tfma.CellRenderer.isBoundedValue(metric_value) ||
           tfma.CellRenderer.isRatioValue(metric_value));
    };
    return [...allMetrics].filter(isSupportedMetricFormat);
  }

  /**
   * Updates selectable metrics and available thresholds from available
   * metrics.
   * @param {!Array<string>|undefined} availableMetricsNames_
   * @private
   */
  updateSelectableMetrics_(availableMetricsNames_) {
    const thresholdedMetrics = new Set();
    const otherMetrics = new Set();
    availableMetricsNames_.forEach(metricName => {
      const fairnessMetric = Util.extractFairnessMetric(metricName);
      if (fairnessMetric) {
        thresholdedMetrics.add(fairnessMetric.name);
      } else {
        otherMetrics.add(metricName);
      }
    });

    const setToArray = (s) => Array.from(s.entries()).map(entry => entry[0]);
    this.selectableMetrics_ = [
      ...setToArray(thresholdedMetrics).sort((a, b) => a.localeCompare(b)),
      ...setToArray(otherMetrics).sort((a, b) => a.localeCompare(b))
    ];
  }
};

customElements.define('fairness-nb-container', FairnessNbContainer);
