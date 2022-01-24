<template>
    <form id="universalWidgetDetails" class="settingsBox">
        <div>
            <label for="widgetId">Widget ID</label>
            <input name="widgetId" id="widgetId" v-model="moduleId"/>
        </div>
        <div>
            <label for="theme">Widget Theme</label>
            <input name="theme" id="theme" v-model="theme"/>
        </div>
    </form>
</template>