#target illustrator
(function () {
  var root = Folder(File($.fileName).parent.parent.parent.fsName);
  var out = new File(root.fsName + '/tmp/illustrator-sample-report.txt');
  if (!out.parent.exists) out.parent.create();
  out.encoding = 'UTF-8'; out.open('w');
  var names = ['F3TEST.ai', 'F3TEST.pdf'];
  for (var n = 0; n < names.length; n++) {
    var doc = null;
    try {
      doc = app.open(new File(root.fsName + '/' + names[n]));
      out.writeln('FILE ' + names[n] + ' artboards=' + doc.artboards.length + ' frames=' + doc.textFrames.length + ' pages=' + doc.pageItems.length);
      var fonts = {}, kinds = {}, chinese = 0, english = 0, empty = 0, locked = 0, hidden = 0;
      for (var i = 0; i < doc.textFrames.length; i++) {
        var f = doc.textFrames[i], s = f.contents;
        kinds[String(f.kind)] = (kinds[String(f.kind)] || 0) + 1;
        if (/[\u4e00-\u9fff]/.test(s)) chinese++; else if (/[A-Za-z]/.test(s)) english++; else empty++;
        if (f.locked) locked++; if (f.hidden) hidden++;
        try { fonts[f.textRange.characterAttributes.textFont.name] = true; } catch (_) {}
        if (i < 12) out.writeln('FRAME ' + i + ' kind=' + f.kind + ' text=' + s.replace(/[\r\n]+/g,'|').slice(0,90));
      }
      out.writeln('STATS chinese=' + chinese + ' english=' + english + ' empty=' + empty + ' locked=' + locked + ' hidden=' + hidden);
      for (var k in kinds) out.writeln('KIND ' + k + '=' + kinds[k]);
      for (var t in fonts) out.writeln('FONT ' + t);
    } catch (e) { out.writeln('ERROR ' + names[n] + ' ' + e); }
    finally { if (doc) doc.close(SaveOptions.DONOTSAVECHANGES); }
  }
  out.close();
})();
