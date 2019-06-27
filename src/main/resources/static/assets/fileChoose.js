/**
 * 文件选择扩展模块
 * date:2019-06-27   License By http://easyweb.vip
 */
layui.define(['jquery', 'layer', 'form', 'upload', 'laytpl', 'util'], function (exports) {
    var $ = layui.jquery;
    var layer = layui.layer;
    var form = layui.form;
    var upload = layui.upload;
    var laytpl = layui.laytpl;
    var util = layui.util;

    var fileChoose = {};

    // 打开选择文件弹窗
    fileChoose.open = function (param) {
        var accept = param.accept;  // 文件类型
        var exts = param.exts;  // 文件后缀
        var multi = param.multi;  // 是否多选
        var maxNum = param.maxNum;  // 最大选择数量
        var fileServer = param.fileServer;  // 文件服务器url
        var onChoose = param.onChoose;  // 选择回调

        accept || (accept = 'file');

        layer.open({
            type: 1,
            title: '选择文件',
            content: 'fileChoose.html?multi=true',
            area: ['600px', '420px'],
            offset: '50px',
            shade: .1,
            fixed: false,
            success: function () {
                init();
            }
        });


        // 渲染文件列表
        function renderList(dir) {
            dir || (dir = $('#fc-current-position').text());
            layer.load(2);
            $.get(fileServer + 'api/list', {
                dir: dir,
                accept: accept,
                exts: exts
            }, function (res) {
                layer.closeAll('loading');
                if (res.code == 200) {
                    for (var i = 0; i < res.data.length; i++) {
                        res.data[i].url = fileServer + 'file/' + res.data[i].url;
                        res.data[i].smUrl = fileServer + 'file/' + res.data[i].smUrl;
                    }
                    laytpl($('#fc-file-item-tpl').html()).render(res.data, function (html) {
                        $('#fc-btn-ok-sel').text('完成选择');
                        $('.fc-file-list-group').html(html);
                        form.render('checkbox');
                    });
                } else {
                    layer.msg(res.msg, {icon: 2});
                }
            });
        }

        // 事件处理
        function init() {
            (multi && multi == 'true') && ($('body').addClass('showBB'));
            renderList();
            // 上传文件事件
            var nExts;
            if (exts) {
                nExts = exts.replace(/,/g, "|");
            }
            upload.render({
                elem: '#fc-btn-upload',
                url: fileServer + 'file/upload',
                choose: function (obj) {
                    layer.load(2);
                },
                done: function (res, index, upload) {
                    layer.closeAll('loading');
                    if (res.code != 200) {
                        layer.msg(res.msg, {icon: 2});
                    } else {
                        layer.msg(res.msg, {icon: 1});
                        $('#fc-current-position').text(util.toDateString(new Date(), '/yyyy/MM/dd'));
                        renderList();
                    }
                },
                error: function () {
                    layer.closeAll('loading');
                    layer.msg('上传失败', {icon: 2});
                },
                accept: accept == 'image' ? 'imagess' : accept,
                exts: nExts
            });

            // 刷新
            $('#fc-btn-refresh').click(function () {
                renderList();
            });

            var mUrl;
            // 列表点击事件
            $('body').on('click', '.fc-file-list-group-item', function (e) {
                var isDir = $(this).data('dir');
                var name = $(this).data('name');
                mUrl = $(this).data('url');
                $('#copy').attr('data-clipboard-text', mUrl);
                if (isDir) {
                    var cDir = $('#fc-current-position').text();
                    cDir += (cDir == '/' ? name : ('/' + name));
                    $('#fc-current-position').text(cDir);
                    renderList(cDir);
                } else {
                    var $target = $(this).find('.fc-file-list-group-img');
                    $('#fc-dropdown-choose').css({
                        'top': $target.offset().top + 90,
                        'left': $target.offset().left + 25
                    });
                    $('#fc-dropdown-choose').addClass('dropdown-opened');
                    if (e !== void 0) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
            });

            // 返回上级
            $('#fc-btn-back').click(function () {
                var cDir = $('#fc-current-position').text();
                if (cDir == '/') {
                    // layer.msg('已经是根目录', {icon: 2})
                } else {
                    cDir = cDir.substring(0, cDir.lastIndexOf('/'));
                    if (!cDir) {
                        cDir = '/';
                    }
                    $('#fc-current-position').text(cDir);
                    renderList(cDir);
                }
            });

            // 点击空白隐藏下拉框
            $('html').off('click.dropdown').on('click.dropdown', function () {
                $('#copy').attr('data-clipboard-text', '');
                $('#fc-dropdown-choose').removeClass('dropdown-opened');
            });

            // 打开
            $('#fc-dropdown-btn-open').click(function () {
                window.open(mUrl);
            });
            // 选择
            $('#fc-dropdown-btn-sel').click(function () {
                if (!multi || multi == 'false') {
                    var urls = [];
                    urls.push(mUrl);
                    okChoose(urls);
                } else {
                    $('.fc-file-list-group-item[data-url="' + mUrl + '"] .layui-form-checkbox').trigger('click');
                }
            });

            // 多选框事件
            $('body').on('click', '.fc-file-list-group-ck', function (e) {
                if (e !== void 0) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            // 完成选择按钮
            $('#fc-btn-ok-sel').click(function () {
                var urls = [];
                $('input[name="imgCk"]:checked').each(function () {
                    urls.push($(this).parents('.fc-file-list-group-item').data('url'));
                });
                if (urls.length <= 0) {
                    layer.msg('请选择', {icon: 2});
                    return;
                }
                if (maxNum && parseInt(maxNum) > 1 && urls.length > maxNum) {
                    layer.msg('最多只能选择' + maxNum + '个', {icon: 2});
                    return;
                }
                okChoose(urls);
            });

            // 监听复选框选中
            form.on('checkbox(imgCk)', function (data) {
                var ckSize = $('input[name="imgCk"]:checked').length;
                if (data.elem.checked) {
                    if (maxNum && parseInt(maxNum) > 1 && ckSize > maxNum) {
                        layer.msg('最多只能选择' + maxNum + '个', {icon: 2});
                        $(data.elem).prop('checked', false);
                        form.render('checkbox');
                        return;
                    }
                    $(data.elem).parents('.fc-file-list-group-item').addClass('active');
                } else {
                    $(data.elem).parents('.fc-file-list-group-item').removeClass('active');
                }
                $('#fc-btn-ok-sel').text('完成选择(' + ckSize + ')');
            });
        }

        // 完成选择
        function okChoose(urls) {
            onChoose && onChoose(urls);
            var id = $(elem).parents('.layui-layer').attr('id').substring(11);
            layer.close(id);
        }

    };

    // 获取页面html
    function getHtml() {

    }

    exports("fileChoose", fileChoose);
});

