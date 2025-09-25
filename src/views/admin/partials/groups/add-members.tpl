<input class="form-control" type="text" placeholder="[[global:search]]"/>

<div class="list-group" id="search-result">
    {{{each users}}}
    <a href="#" class="list-group-item" data-username="{users.username}" data-uid="{users.uid}">
        <i class="fa fa-fw fa-check invisible"></i> {users.username}
    </a>
    {{{end}}}
</div>

<div class="mt-2 text-end">
    <button id="confirm-add-member" class="btn btn-primary">[[groups:details.add-member]]</button>
</div>
