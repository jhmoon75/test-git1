define(function (require) {
    "use strict";

    var $ = require("jquery"),
        JsonConst = require("common/jsonConstants"),
        PivotCacheDefinition = require("model/pivot/client/pivotCacheDefinition"),
        PivotCacheRecords = require("model/pivot/client/pivotCacheRecords"),
        PivotTableDefinition = require("model/pivot/client/pivotTableDefinition"),

        _self,
        _model,

        _cacheDefObject,
        _cacheRecordObject,
        _tableDefObject,

        /*
         pivotTableDefinition -> name 생성은 1부터 생성할때마다 순차적으로 index가 증가된다.
         만약 문서를 다시 열었다면 name은 1부터 초기화된다. (엑셀 스펙)
         */
        _tableNameCount = 1;

    /**
     * pivot 객체의 key의 numbering을 가져온다.
     * @param {string} key
     * @param {string} str
     * @returns {number}
     * @private
     */
    function _getKeyNum(key, str) {
        return Number(key.split(str)[1]);
    }

    /**
     * add pivot cache
     * @param {object} pivotCacheDefinition
     * @param {object} pivotCacheRecords
     * @returns {string|*}
     * @private
     */
    function _addPivotCache(pivotCacheDefinition, pivotCacheRecords) {
        var keys, lastKey, addKey = 1,
            pivotCacheDefinitionKey, pivotCacheRecordsKey;

        keys = Object.keys(_cacheDefObject);

        if (keys.length > 0) {
            lastKey = keys[keys.length - 1];
            lastKey = _getKeyNum(lastKey, JsonConst.PIVOT_CACHE_DEFINITION);
            addKey = lastKey + 1;
        }

        pivotCacheDefinitionKey = JsonConst.PIVOT_CACHE_DEFINITION + addKey;
        pivotCacheRecordsKey = JsonConst.PIVOT_CACHE_RECORDS + addKey;

        // if (pivotCacheRecords) {
        // }
        // pivotCacheDefinition -> pivotCacheRecords의 의존성 추가
        pivotCacheDefinition.setRecordKey(pivotCacheRecordsKey);

        // object key는 숫자 -> 문자 순서로 정렬된다는걸 주의해야함.
        // 현재 key 스펙은 문자이므로 상관없지만 key스펙이 변경될 경우 확인 필요
        _cacheDefObject[pivotCacheDefinitionKey] = pivotCacheDefinition;
        _cacheRecordObject[pivotCacheRecordsKey] = pivotCacheRecords;

        return pivotCacheDefinitionKey;
    }

    /**
     * add pivot table
     * @param {object} pivotTableDefinition
     * @returns {string|*}
     * @private
     */
    function _addPivotTableDefinition(pivotTableDefinition) {
        var key, num, addKey = 1, existKey,
            keyArray = [], sortedObject = {},
            pivotTableDefinitionKey;

        if (!$.isEmptyObject(_tableDefObject)) {
            for (key in _tableDefObject) {
                if (_tableDefObject.hasOwnProperty(key)) {
                    num = _getKeyNum(key, JsonConst.PIVOT_TABLE_DEFINITION);
                    keyArray.push(num);
                }
            }

            keyArray.sort(function(a, b) { // 숫자 오름차순 정렬
                return a - b;
            });

            addKey = Number(keyArray[keyArray.length - 1]) + 1;

            // 정렬된 키이름 배열을 이용하여 object 재구성
            for (key = 0; key < keyArray.length; key++) {
                existKey = JsonConst.PIVOT_TABLE_DEFINITION + keyArray[key];
                sortedObject[existKey] = _tableDefObject[existKey];
            }

            _tableDefObject = sortedObject;
        }
        pivotTableDefinitionKey = JsonConst.PIVOT_TABLE_DEFINITION + addKey;

        // 신규 pivotTable 추가
        _tableDefObject[pivotTableDefinitionKey] = pivotTableDefinition;

        return pivotTableDefinitionKey;
    }

    /**
     * pivot cache 데이터 삭제 및 재정렬
     * @param removeCacheKey
     * @private
     */
    function _removePivotCache(removeCacheKey) {
        var key, newKey, needShiftKey = false,
            removeRecordKey;

        // pivotCacheDefinition key 삭제 및 shift
        for (key in _cacheDefObject) {
            if (_cacheDefObject.hasOwnProperty(key)) {
                if (key == removeCacheKey) {
                    removeRecordKey = _cacheDefObject[key].getRecordKey();
                    needShiftKey = true;

                    delete _cacheDefObject[key];
                    continue;
                }

                if (needShiftKey) {
                    newKey = _getKeyNum(key, JsonConst.PIVOT_CACHE_DEFINITION);
                    newKey--;

                    _cacheDefObject[key].setRecordKey(JsonConst.PIVOT_CACHE_RECORDS + newKey);
                    _cacheDefObject[JsonConst.PIVOT_CACHE_DEFINITION + newKey] = _cacheDefObject[key];

                    delete _cacheDefObject[key];
                }
            }
        }

        // pivotCacheRecords key 삭제 및 shift
        needShiftKey = false;
        for (key in _cacheRecordObject) {
            if (_cacheRecordObject.hasOwnProperty(key)) {
                if (key == removeRecordKey) {
                    needShiftKey = true;

                    delete _cacheRecordObject[key];
                    continue;
                }

                if (needShiftKey) {
                    newKey = _getKeyNum(key, JsonConst.PIVOT_CACHE_RECORDS);
                    newKey--;

                    _cacheRecordObject[JsonConst.PIVOT_CACHE_RECORDS + newKey] = _cacheRecordObject[key];

                    delete _cacheRecordObject[key];
                }
            }
        }
    }

    /**
     * remove pivot table
     * @param {object} removeKey
     * @private
     */
    function _removePivotTableDefinition(removeKey) {
        var key, num, existKey,
            keyArray = [], sortedObject = {};

        // 선택된 피벗테이블을 삭제하고..
        delete _tableDefObject[removeKey];

        // pivotTableDefinition key 재정렬
        // pivotCacheDefinition key 재정렬
        // sheetInfo -> pivot key 재정렬

        for (key in _tableDefObject) {
            if (_tableDefObject.hasOwnProperty(key)) {
                num = _getKeyNum(key, JsonConst.PIVOT_TABLE_DEFINITION);
                keyArray.push(num);
            }
        }

        keyArray.sort(function(a, b) { // 숫자 오름차순 정렬
            return a - b;
        });

        // 정렬된 키이름 배열을 이용하여 object 재구성
        for (key = 0; key < keyArray.length; key++) {
            existKey = JsonConst.PIVOT_TABLE_DEFINITION + keyArray[key];
            sortedObject[existKey] = _tableDefObject[existKey];
        }

        _tableDefObject = sortedObject;
    }

    return {
        /**
         * initalize
         */
        init: function (model) {
            _self = this;
            _model = model;
            _cacheDefObject = {};
            _cacheRecordObject = {};
            _tableDefObject = {};
        },

        /**
         * pivot model을 등록한다.
         * @param {object} model
         */
        setModel: function (model) {
            var key,
                cacheModel, recordModel, tableModel,
                pivotCacheDefinition,
                pivotCacheRecords,
                pivotTableDefinition,
                modelPivotTableDefinition;

            if (!model) {
                return;
            }
            // console.info('원본 pivot json model', model);

            cacheModel = model.cache;
            recordModel = model.record;
            tableModel = model.table;

            // 모델은 pivotCacheDefinition -> pivotCacheRecords -> pivotTableDefinition 순서로 등록해야함
            if (cacheModel) {
                for (key in cacheModel) {
                    if (cacheModel.hasOwnProperty(key)) {
                        pivotCacheDefinition = new PivotCacheDefinition();
                        pivotCacheDefinition.setModel(cacheModel[key][JsonConst.PIVOT_CACHE_DEFINITION]);
                        _cacheDefObject[key] = pivotCacheDefinition;
                    }
                }
            }

            if (recordModel) {
                for (key in recordModel) {
                    if (recordModel.hasOwnProperty(key)) {
                        pivotCacheRecords = new PivotCacheRecords();
                        pivotCacheRecords.setModel(recordModel[key][JsonConst.PIVOT_CACHE_RECORDS]);
                        _cacheRecordObject[key] = pivotCacheRecords;
                    }
                }
            }

            if (tableModel) {
                for (key in tableModel) {
                    if (tableModel.hasOwnProperty(key)) {
                        modelPivotTableDefinition = tableModel[key][JsonConst.PIVOT_TABLE_DEFINITION];
                        pivotTableDefinition = new PivotTableDefinition();
                        pivotTableDefinition.init(_self);
                        pivotTableDefinition.setDependency(modelPivotTableDefinition.cacheKey);
                        pivotTableDefinition.setModel(modelPivotTableDefinition);
                        _tableDefObject[key] = pivotTableDefinition;
                    }
                }
            }

            // for (key in _cacheDefObject) {
            //     if (!_cacheDefObject.hasOwnProperty(key)) {
            //         continue;
            //     }
            //     console.info(key + ' --> ', _cacheDefObject[key].toObject());
            // }
            //
            // for (key in _cacheRecordObject) {
            //     if (!_cacheRecordObject.hasOwnProperty(key)) {
            //         continue;
            //     }
            //     console.info(key + ' --> ', _cacheRecordObject[key].toObject());
            // }
            //
            // for (key in _tableDefObject) {
            //     if (!_tableDefObject.hasOwnProperty(key)) {
            //         continue;
            //     }
            //     console.info(key + ' --> ', _tableDefObject[key].toObject());
            // }
        },

        /**
         * 현재 영역의 pivot cache 정보(key)를 가져온다.
         * @param {number} sheetName
         * @param {number} row1
         * @param {number} col1
         * @param {number} row2
         * @param {number} col2
         * @returns {*}
         */
        getCacheObjectKeys: function (sheetName, row1, col1, row2, col2) {
            var key, cacheDefinition, cacheSheetName, cacheOffset,
                cacheObjectKeys = null;

            for (key in _cacheDefObject) {
                if (_cacheDefObject.hasOwnProperty(key)) {
                    cacheDefinition = _cacheDefObject[key];

                    cacheSheetName = cacheDefinition.getCacheSourceSheet();
                    cacheOffset = cacheDefinition.getCacheSourceOffset();

                    if (sheetName == cacheSheetName && cacheOffset[0] == row1 && cacheOffset[1] == col1 && cacheOffset[2] == row2 && cacheOffset[3] == col2) {
                        cacheObjectKeys = [key, cacheDefinition.getRecordKey()];
                        break;
                    }
                }
            }

            return cacheObjectKeys;
        },

        /**
         * pivot table 생성
         * @param {string} cacheSheetName
         * @param {object} cacheOffset
         * @param {string} tableSheetIndex
         * @param {object} tableOffset
         * @param {boolean} removeRecordData
         */
        addPivotTable: function (cacheSheetName, cacheOffset, tableSheetIndex, tableOffset, removeRecordData) {
            var cacheObjectKeys,
                pivotCacheDefinition,
                pivotCacheRecords,
                pivotTableDefinition,
                cacheKey, tableKey;

            cacheObjectKeys = this.getCacheObjectKeys(cacheSheetName, cacheOffset[0], cacheOffset[1], cacheOffset[2], cacheOffset[3]);
            if (!cacheObjectKeys) { // 없을 경우는 pivot cache data를 등록 해야한다.
                pivotCacheDefinition = new PivotCacheDefinition();
                pivotCacheDefinition.create(cacheSheetName, cacheOffset[0], cacheOffset[1], cacheOffset[2], cacheOffset[3]);

                if (!removeRecordData) {
                    pivotCacheRecords = new PivotCacheRecords();
                    pivotCacheRecords.create(cacheSheetName, cacheOffset[0], cacheOffset[1], cacheOffset[2], cacheOffset[3]);
                }

                cacheKey = _addPivotCache(pivotCacheDefinition, pivotCacheRecords);
            } else {
                cacheKey = cacheObjectKeys[0];
            }

            pivotTableDefinition = new PivotTableDefinition();
            pivotTableDefinition.init(_self);
            pivotTableDefinition.setDependency(cacheKey);
            // TODO 일단 신규시트에 피벗테이블 생성하는걸로 구현 A3:C20
            pivotTableDefinition.create("피벗 테이블" + _tableNameCount, tableOffset[0], tableOffset[1], tableOffset[2], tableOffset[3]);

            tableKey = _addPivotTableDefinition(pivotTableDefinition);

            _model.getSheetInfoByIndex(tableSheetIndex).insertPivot(tableKey);

            _tableNameCount++;
        },

        /**
         * pivot table 삭제
         * @param {string} removeTableKey
         */
        removePivotTable: function (removeTableKey) {
            var key, removeCacheKey,
                isDeleteCache = true, tableDefinition;

            // 삭제할 pivotTableKey 와 pivotCachekey를 구한다.
            tableDefinition = _tableDefObject[removeTableKey];
            removeCacheKey = tableDefinition.getCacheKey();

            // 한번더 검색해 삭제할 pivotTable이 아닌 다른 pivotTable에서 pivotCacheKey를 참조하고 있는지 확인 한다.
            for (key in _tableDefObject) {
                if (_tableDefObject.hasOwnProperty(key)) {
                    if (key != removeTableKey) {
                        tableDefinition = _tableDefObject[key];
                        if (tableDefinition.getCacheKey() == removeCacheKey) {
                            isDeleteCache = false;
                            break;
                        }
                    }
                }
            }

            if (isDeleteCache) { // pivotCacheDefinition, pivotCacheRecords 삭제
                _removePivotCache(removeCacheKey);
            }

            _removePivotTableDefinition(removeTableKey);
        },

        /**
         * pivotCacheDefinition 관리 객체를 가져온다
         * @returns {*}
         */
        getCacheDefObject: function () {
            return _cacheDefObject;
        },

        /**
         * pivotCacheRecords 관리 객체를 가져온다
         * @returns {*}
         */
        getCacheRecordObject: function () {
            return _cacheRecordObject;
        },

        /**
         * pivotTableDefinition 관리 객체를 가져온다
         * @returns {*}
         */
        getTableDefObject: function () {
            return _tableDefObject;
        },

        /**
         * pivotTableDefinition 정보 객체를 가져온다
         * @returns {*}
         */
        getPivotTableDefinition: function (key) {
            return _tableDefObject[key];
        }
    };
});