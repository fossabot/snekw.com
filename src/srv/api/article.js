/**
 *  snekw.com,
 *  Copyright (C) 2018 Ilkka Kuosmanen
 *
 *  This file is part of snekw.com.
 *
 *  snekw.com is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  snekw.com is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with snekw.com.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';
const router = require('express').Router();
const ensureAdmin = require('../../lib/ensureAdmin');
const models = require('../../db/models');
const cachedData = require('../../db/CachedData');
const querys = require('../../db/querys');
const errors = require('../ErrorJSONAPI');

let timeStampLastFrontPageUpdate = 0;

function updateFrontPage () {
  if (timeStampLastFrontPageUpdate > Date.now() - 4000) {
    return;
  }
  timeStampLastFrontPageUpdate = Date.now();
  cachedData.updateCache(cachedData.keys.indexArticles, querys.indexArticlesQuery);
}

router.post('/public-state', ensureAdmin, function (req, res, next) {
  let paramsMissing = [];
  if (!req.body) {
    paramsMissing.push('body');
  }
  if (!req.body.id) {
    paramsMissing.push('id');
  }
  if (!req.body.state) {
    paramsMissing.push('state');
  }
  if (paramsMissing.length > 0) {
    return next(new errors.ErrorMissingParameters(paramsMissing));
  }

  let update = {public: req.body.state};
  if (req.body.state === '1' && req.body.updatePostedAt) {
    update.postedAt = Date.now();
  }
  models.article.findByIdAndUpdate(req.body.id, update)
    .lean()
    .exec((err, doc) => {
      if (err) {
        return next(err);
      }
      return res.status(200).json({id: req.body.id, state: req.body.state});
    });
  setTimeout(updateFrontPage, 5000);
});

module.exports = router;
